// Shared Undeployed provider bootstrap for deploy + append (Node / Vite server only).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Buffer } from "node:buffer";
import WebSocket from "ws";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { NodeZkConfigProvider } from "@midnight-ntwrk/midnight-js-node-zk-config-provider";
import { levelPrivateStateProvider } from "@midnight-ntwrk/midnight-js-level-private-state-provider";
import { CompiledContract } from "@midnight-ntwrk/midnight-js-protocol/compact-js";
import { NetworkId as WalletSdkNetworkId } from "@midnight-ntwrk/wallet-sdk";
import { MidnightWalletProvider, createLogger } from "@midnight-ntwrk/testkit-js";
import {
  CONTRACTS,
  GENESIS_SEED,
  PRIVATE_STATE_STORE,
  PRIVATE_STORAGE_PASSWORD,
  PRIMARY_CONTRACT,
  deployerSecretBytes,
  type ContractKey,
} from "./midnight-shared";

globalThis.WebSocket = globalThis.WebSocket ?? (WebSocket as unknown as typeof globalThis.WebSocket);
globalThis.Buffer = globalThis.Buffer ?? Buffer;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");

export type PrivateState = {
  localSecretKey?: Uint8Array;
  buyerSecret?: Uint8Array;
  merchantSecret?: Uint8Array;
};

export function resolveContractModulePath(contractName = PRIMARY_CONTRACT): string {
  const zk = path.resolve(ROOT, "contracts", "managed", contractName);
  const candidates = [
    path.resolve(ROOT, "public", "contract", contractName, "contract", "index.js"),
    path.resolve(ROOT, "public", "contract", contractName, "contract", "index.cjs"),
    path.resolve(zk, "contract", "index.js"),
    path.resolve(zk, "contract", "index.cjs"),
  ];
  // Primary artefacts may also live at public/contract/contract (legacy single-contract layout).
  if (contractName === PRIMARY_CONTRACT) {
    candidates.unshift(
      path.resolve(ROOT, "public", "contract", "contract", "index.js"),
      path.resolve(ROOT, "public", "contract", "contract", "index.cjs"),
    );
  }
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) {
    throw new Error(
      `Missing compiled contract module for ${contractName}. Run: bun run midnight:compile && bun run midnight:artefacts`,
    );
  }
  return found;
}

export function zkConfigPath(contractName = PRIMARY_CONTRACT): string {
  const p = path.resolve(ROOT, "contracts", "managed", contractName);
  if (!fs.existsSync(p)) {
    throw new Error(`Missing ${p}. Run: bun run midnight:compile`);
  }
  return p;
}

function contractMeta(contractName: string) {
  const entry = Object.values(CONTRACTS).find((c) => c.name === contractName);
  if (!entry) throw new Error(`Unknown contract ${contractName}`);
  return entry;
}

export function witnessesFor(
  contractName: string,
  secret: Uint8Array,
  mode: "deploy" | "privateState",
) {
  const { witness } = contractMeta(contractName);
  if (mode === "deploy") {
    return {
      [witness]: (ctx: { privateState: PrivateState }) =>
        [ctx.privateState, secret] as [PrivateState, Uint8Array],
    };
  }
  return {
    [witness]: (ctx: { privateState: PrivateState }) => {
      const fromState =
        (ctx.privateState as Record<string, Uint8Array | undefined>)[witness] ?? secret;
      return [ctx.privateState, fromState] as [PrivateState, Uint8Array];
    },
  };
}

export function initialPrivateStateFor(contractName: string, secret: Uint8Array): PrivateState {
  const { witness } = contractMeta(contractName);
  return { [witness]: secret } as PrivateState;
}

export async function buildCompiledContract(opts?: {
  contractName?: string;
  secretForDeploy?: Uint8Array;
}) {
  const name = opts?.contractName ?? PRIMARY_CONTRACT;
  const mod = await import(resolveContractModulePath(name));
  const Contract = mod.Contract;
  const secret = opts?.secretForDeploy ?? deployerSecretBytes();
  const witnesses = witnessesFor(
    name,
    secret,
    opts?.secretForDeploy ? "deploy" : "privateState",
  );
  return CompiledContract.withCompiledFileAssets(
    CompiledContract.withWitnesses(CompiledContract.make(name, Contract), witnesses),
    zkConfigPath(name),
  );
}

export async function buildUndeployedProviders(opts?: { contractName?: string }) {
  setNetworkId("undeployed");

  const INDEXER_URL = process.env.VITE_INDEXER_URL ?? "http://localhost:8088/api/v4/graphql";
  const INDEXER_WS = process.env.VITE_INDEXER_WS_URL ?? "ws://localhost:8088/api/v4/graphql/ws";
  const PROOF_URL = process.env.VITE_PROOF_SERVER_URL ?? "http://localhost:6300";
  const NODE_WS = process.env.VITE_NODE_WS ?? "ws://localhost:9944";
  const contractName = opts?.contractName ?? PRIMARY_CONTRACT;

  const url = new URL(NODE_WS);
  if (url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    throw new Error("Undeployed providers only support ws://localhost:9944");
  }

  const env = {
    walletNetworkId: WalletSdkNetworkId.NetworkId.Undeployed,
    networkId: "undeployed",
    indexer: INDEXER_URL,
    indexerWS: INDEXER_WS,
    node: NODE_WS.replace(/^ws/, "http"),
    nodeWS: NODE_WS,
    proofServer: PROOF_URL,
    faucet: undefined as string | undefined,
  };

  const logger = createLogger("warn");
  const midnightWallet = await MidnightWalletProvider.build(logger, env, GENESIS_SEED);
  await midnightWallet.start(true);

  const zk = new NodeZkConfigProvider(zkConfigPath(contractName));
  const accountId = Buffer.from(midnightWallet.getCoinPublicKey()).toString("hex");
  const providers = {
    privateStateProvider: levelPrivateStateProvider({
      privateStateStoreName: PRIVATE_STATE_STORE,
      signingKeyStoreName: `${PRIVATE_STATE_STORE}-signing-keys`,
      privateStoragePasswordProvider: () => PRIVATE_STORAGE_PASSWORD,
      accountId,
    }),
    publicDataProvider: indexerPublicDataProvider(INDEXER_URL, INDEXER_WS),
    zkConfigProvider: zk,
    proofProvider: httpClientProofProvider(PROOF_URL, zk),
    walletProvider: midnightWallet,
    midnightProvider: midnightWallet,
  };

  return { providers, midnightWallet, accountId, contractName };
}

export function contractKeyFromName(name: string): ContractKey | null {
  const hit = (Object.entries(CONTRACTS) as [ContractKey, (typeof CONTRACTS)[ContractKey]][]).find(
    ([, v]) => v.name === name,
  );
  return hit?.[0] ?? null;
}
