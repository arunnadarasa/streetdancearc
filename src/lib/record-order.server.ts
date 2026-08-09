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
const NAME = CONTRACTS.orderLedger.name;

function readAddress(): string {
  const env = process.env.VITE_ORDER_CONTRACT;
  if (env) return env;
  const p = path.join(ROOT, "src/data/midnight-contract.undeployed.json");
  if (!fs.existsSync(p)) throw new Error(`Missing ${p}. Run: bun run midnight:deploy`);
  const j = JSON.parse(fs.readFileSync(p, "utf8"));
  const addr = j.contracts?.orderLedger?.address;
  if (!addr) throw new Error("No OrderLedger address in deploy JSON");
  return addr;
}

async function deriveMerchantPk(sk: Uint8Array): Promise<Uint8Array> {
  const vecType = new CompactTypeVector(2, new CompactTypeBytes(32));
  return persistentHash(vecType, [padBytes32("ucp:merchant:v1"), sk]);
}

function idToBytes32(id: string): Uint8Array {
  const clean = id.replace(/^0x/, "");
  if (/^[0-9a-fA-F]{64}$/.test(clean)) return hexToBytes32(clean);
  // Hash-like pad of arbitrary string ids
  const enc = new TextEncoder().encode(id);
  const out = new Uint8Array(32);
  out.set(enc.slice(0, 32));
  return out;
}

export async function recordOrderOnUndeployed(input: {
  orderId: string;
  itemHash: string;
  buyer: string;
  amount: number | string;
}): Promise<{
  midnightTxHash: string;
  contractAddress: string;
  merchantPk: string;
  simulated: false;
}> {
  const address = readAddress();
  const secret = deployerSecretBytes();
  const merchantPk = await deriveMerchantPk(secret);
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

  // Ensure signing key fingerprint is recorded once.
  try {
    await found.callTx.recordSigningKey(merchantPk);
  } catch {
    // already set
  }

  const result = await found.callTx.recordOrder(
    idToBytes32(input.orderId),
    idToBytes32(input.itemHash),
    idToBytes32(input.buyer),
    BigInt(Math.max(0, Math.floor(Number(input.amount)))),
  );
  return {
    midnightTxHash: String(result.public.txHash ?? result.public.txId),
    contractAddress: address,
    merchantPk: bytesToHex(merchantPk),
    simulated: false,
  };
}
