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
const NAME = CONTRACTS.midnightUsdc.name;

function readAddress(): string {
  // Prefer deploy JSON over process.env — Vite caches VITE_* across redeploys.
  const p = path.join(ROOT, "src/data/midnight-contract.undeployed.json");
  if (fs.existsSync(p)) {
    const j = JSON.parse(fs.readFileSync(p, "utf8"));
    const addr = j.contracts?.midnightUsdc?.address;
    if (addr) return addr;
  }
  const env = process.env.VITE_MUSDC_CONTRACT;
  if (env) return env;
  throw new Error("No MidnightUSDC address in deploy JSON — run: bun run midnight:deploy");
}

async function deriveSignerPk(sk: Uint8Array): Promise<Uint8Array> {
  const vecType = new CompactTypeVector(2, new CompactTypeBytes(32));
  return persistentHash(vecType, [padBytes32("musdc:signer:v1"), sk]);
}

async function withMusdc<T>(
  fn: (ctx: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    found: any;
    address: string;
    signerPk: Uint8Array;
  }) => Promise<T>,
): Promise<T> {
  const address = readAddress();
  const secret = deployerSecretBytes();
  const { providers, midnightWallet } = await buildUndeployedProviders({
    contractName: NAME,
  });
  try {
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
    return await fn({
      found,
      address,
      signerPk: await deriveSignerPk(secret),
    });
  } finally {
    // Release genesis LevelDB / dust wallet before MoveNft opens the same seed.
    try {
      await midnightWallet.stop();
    } catch {
      /* ignore */
    }
  }
}

export async function musdcFaucet(): Promise<{
  midnightTxHash: string;
  contractAddress: string;
  signerPk: string;
}> {
  return withMusdc(async ({ found, address, signerPk }) => {
    const result = await found.callTx.faucet();
    return {
      midnightTxHash: String(result.public.txHash ?? result.public.txId),
      contractAddress: address,
      signerPk: bytesToHex(signerPk),
    };
  });
}

export async function musdcTransfer(input: {
  toHex: string;
  amountAtomic: string | number | bigint;
  nonceHex?: string;
}): Promise<{
  midnightTxHash: string;
  contractAddress: string;
  fromPk: string;
  toPk: string;
  amount: string;
  simulated: false;
  network: "undeployed";
  indexerUrl: string;
}> {
  return withMusdc(async ({ found, address, signerPk }) => {
    const nonce =
      input.nonceHex && /^[0-9a-fA-F]{64}$/.test(input.nonceHex.replace(/^0x/, ""))
        ? hexToBytes32(input.nonceHex)
        : crypto.getRandomValues(new Uint8Array(32));
    const to = hexToBytes32(input.toHex);
    const amount = BigInt(input.amountAtomic);
    const result = await found.callTx.transfer(to, amount, nonce);
    return {
      midnightTxHash: String(result.public.txHash ?? result.public.txId),
      contractAddress: address,
      fromPk: bytesToHex(signerPk),
      toPk: bytesToHex(to),
      amount: amount.toString(),
      simulated: false,
      network: "undeployed",
      indexerUrl: process.env.VITE_INDEXER_URL ?? "http://localhost:8088/api/v4/graphql",
    };
  });
}
