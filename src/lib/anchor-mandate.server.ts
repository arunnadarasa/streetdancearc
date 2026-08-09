import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findDeployedContract } from "@midnight-ntwrk/midnight-js-contracts";
import { persistentHash, CompactTypeVector, CompactTypeBytes } from "@midnight-ntwrk/compact-runtime";
import {
  CONTRACTS,
  PRIVATE_STATE_ID,
  bytesToHex,
  deployerSecretBytes,
  hexToBytes32,
  padBytes32,
} from "./midnight-shared";
import {
  buildCompiledContract,
  buildUndeployedProviders,
  initialPrivateStateFor,
} from "./midnight-providers.server";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const NAME = CONTRACTS.mandateVault.name;

function readAddress(): string {
  const env = process.env.VITE_MANDATE_CONTRACT;
  if (env) return env;
  const p = path.join(ROOT, "src/data/midnight-contract.undeployed.json");
  if (!fs.existsSync(p)) {
    throw new Error(`Missing ${p}. Run: bun run midnight:deploy`);
  }
  const j = JSON.parse(fs.readFileSync(p, "utf8"));
  const addr = j.contracts?.mandateVault?.address ?? j.address;
  if (!addr) throw new Error("No mandate vault address in deploy JSON");
  return addr;
}

async function deriveBuyerPk(sk: Uint8Array): Promise<Uint8Array> {
  const vecType = new CompactTypeVector(2, new CompactTypeBytes(32));
  return persistentHash(vecType, [padBytes32("ap2:buyer:v1"), sk]);
}

export async function anchorMandateOnUndeployed(input: {
  mandateHash: string;
  seller?: string;
  amount?: number;
}): Promise<{
  midnightTxHash: string;
  network: "undeployed";
  simulated: false;
  indexerUrl: string;
  contractAddress: string;
  buyerPk: string;
}> {
  const address = readAddress();
  const secret = deployerSecretBytes();
  const buyerPk = await deriveBuyerPk(secret);
  const { providers } = await buildUndeployedProviders({ contractName: NAME });
  await providers.privateStateProvider.setContractAddress(address);

  const compiledContract = await buildCompiledContract({
    contractName: NAME,
    secretForDeploy: secret,
  });
  const found = await findDeployedContract(providers, {
    compiledContract,
    contractAddress: address,
    privateStateId: `${PRIVATE_STATE_ID}-${NAME}`,
    initialPrivateState: initialPrivateStateFor(NAME, secret),
  });

  const result = await found.callTx.anchorMandate(
    hexToBytes32(input.mandateHash),
    buyerPk,
    padBytes32(input.seller ?? "seller.streetrail"),
    BigInt(Math.max(0, Math.floor(Number(input.amount ?? 0)))),
  );
  const txHash = String(result.public.txHash ?? result.public.txId);
  return {
    midnightTxHash: txHash,
    network: "undeployed",
    simulated: false,
    indexerUrl: process.env.VITE_INDEXER_URL ?? "http://localhost:8088/api/v4/graphql",
    contractAddress: address,
    buyerPk: bytesToHex(buyerPk),
  };
}
