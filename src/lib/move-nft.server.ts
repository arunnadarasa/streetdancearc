import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash, randomBytes } from "node:crypto";
import { findDeployedContract } from "@midnight-ntwrk/midnight-js-contracts";
import {
  CONTRACTS,
  PRIVATE_STATE_ID,
  bytesToHex,
  deployerSecretBytes,
} from "./midnight-shared";
import {
  buildCompiledContract,
  buildUndeployedProviders,
  initialPrivateStateFor,
} from "./midnight-providers.server";
import { musdcFaucet, musdcTransfer } from "./musdc.server";
import { INDEXER_URL, txExplorerUrl } from "./tokens";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const NAME = CONTRACTS.moveNft.name;
const STATE_PATH = path.join(ROOT, "src/data/move-nft-state.undeployed.json");

export type MoveNftRecord = {
  tokenId: string;
  ownerPk: string;
  ownerLabel: string;
  uri: string;
  name: string;
  listedPriceAtomic: string;
  listed: boolean;
  mintTxId: string | null;
  updatedAt: string;
};

type LedgerFile = {
  contractAddress: string;
  tokens: MoveNftRecord[];
  activity: Array<{
    kind: "mint" | "list" | "cancel" | "buy" | "transfer";
    tokenId: string;
    txId: string;
    actor: string;
    counterparty?: string;
    priceAtomic?: string;
    at: string;
  }>;
};

function emptyLedger(contractAddress = ""): LedgerFile {
  return { contractAddress, tokens: [], activity: [] };
}

function readLedger(): LedgerFile {
  if (!fs.existsSync(STATE_PATH)) return emptyLedger();
  try {
    return JSON.parse(fs.readFileSync(STATE_PATH, "utf8")) as LedgerFile;
  } catch {
    return emptyLedger();
  }
}

function writeLedger(ledger: LedgerFile) {
  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  fs.writeFileSync(STATE_PATH, JSON.stringify(ledger, null, 2));
}

export function readMoveNftAddress(): string {
  const p = path.join(ROOT, "src/data/midnight-contract.undeployed.json");
  if (fs.existsSync(p)) {
    const j = JSON.parse(fs.readFileSync(p, "utf8"));
    const addr = j.contracts?.moveNft?.address;
    if (addr) return addr;
  }
  const env = process.env.VITE_MOVE_NFT_CONTRACT;
  if (env) return env;
  throw new Error("No MoveNft address — run: bun run midnight:deploy");
}

export function ownerPkFromLabel(label: string): Uint8Array {
  const digest = createHash("sha256").update(`movenft:owner:v1:${label.trim()}`).digest();
  return new Uint8Array(digest);
}

export function ownerPkHexFromLabel(label: string): string {
  return bytesToHex(ownerPkFromLabel(label));
}

/** Local numeric token id → on-chain Bytes<32> map key for mint/list. */
export function tokenIdBytes(tokenId: string): Uint8Array {
  const digest = createHash("sha256").update(`movenft:token:v1:${tokenId.trim()}`).digest();
  return new Uint8Array(digest);
}

function nameFromUri(uri: string): string {
  const trimmed = uri.trim();
  if (!trimmed) return "Untitled move";
  try {
    const parsed = JSON.parse(trimmed) as { cid?: string; kind?: string };
    if (parsed.cid) return `Move · ${String(parsed.cid).slice(0, 24)}`;
  } catch {
    /* plain cid / uri */
  }
  return trimmed.startsWith("ipfs://")
    ? `Move · ${trimmed.slice(7, 31)}`
    : `Move · ${trimmed.slice(0, 24)}`;
}

/**
 * Fresh genesis wallet per callTx (same pattern as musdc.server).
 * Only Map.insert of *new* keys is dust-safe; overwrites trip transaction_merge.
 */
async function withMoveNft<T>(
  fn: (ctx: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    found: any;
    address: string;
  }) => Promise<T>,
): Promise<T> {
  const address = readMoveNftAddress();
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
    return await fn({ found, address });
  } finally {
    try {
      await midnightWallet.stop();
    } catch {
      /* ignore */
    }
  }
}

/** No-op kept for older rail-check scripts. */
export async function releaseMoveNftProviders() {
  /* withMoveNft stops the wallet per call */
}

function assertLocalOwner(tokenId: string, ownerLabel: string) {
  const ledger = readLedger();
  const tok = ledger.tokens.find((t) => t.tokenId === tokenId);
  if (!tok) throw new Error(`token ${tokenId} not in local ledger — mint first`);
  const pk = ownerPkHexFromLabel(ownerLabel);
  if (tok.ownerLabel !== ownerLabel.trim() && tok.ownerPk !== pk) {
    throw new Error(`not owner of #${tokenId} (held by ${tok.ownerLabel})`);
  }
  return tok;
}

function txIdOf(result: { public: { txId?: string; txHash?: string } }): string {
  const id = result.public.txId ?? result.public.txHash;
  if (!id) throw new Error("MoveNft circuit succeeded but no txId/txHash");
  return String(id);
}

export async function mintMoveNft(input: {
  ownerLabel: string;
  uri: string;
}): Promise<{
  tokenId: string;
  txId: string;
  contractAddress: string;
  ownerPk: string;
  explorerUrl: string;
}> {
  const ledger = readLedger();
  const nextId = String(
    ledger.tokens.reduce((max, t) => Math.max(max, Number(t.tokenId) || 0), 0) + 1,
  );
  const ownerPk = ownerPkFromLabel(input.ownerLabel);
  const { txId, address } = await withMoveNft(async ({ found, address }) => {
    const result = await found.callTx.mint(tokenIdBytes(nextId), ownerPk);
    return { txId: txIdOf(result), address };
  });

  ledger.contractAddress = address;
  const record: MoveNftRecord = {
    tokenId: nextId,
    ownerPk: bytesToHex(ownerPk),
    ownerLabel: input.ownerLabel.trim(),
    uri: input.uri,
    name: nameFromUri(input.uri),
    listedPriceAtomic: "0",
    listed: false,
    mintTxId: txId,
    updatedAt: new Date().toISOString(),
  };
  ledger.tokens.unshift(record);
  ledger.activity.unshift({
    kind: "mint",
    tokenId: nextId,
    txId,
    actor: input.ownerLabel.trim(),
    at: record.updatedAt,
  });
  writeLedger(ledger);

  return {
    tokenId: nextId,
    txId,
    contractAddress: address,
    ownerPk: bytesToHex(ownerPk),
    explorerUrl: txExplorerUrl(txId),
  };
}

export async function listMoveNft(input: {
  tokenId: string;
  ownerLabel: string;
  priceAtomic: string;
}): Promise<{ txId: string; explorerUrl: string }> {
  const price = BigInt(input.priceAtomic);
  if (price <= 0n) throw new Error("price must be > 0");
  assertLocalOwner(input.tokenId, input.ownerLabel);
  const txId = await withMoveNft(async ({ found }) => {
    const result = await found.callTx.listSale(tokenIdBytes(input.tokenId), price);
    return txIdOf(result);
  });

  const ledger = readLedger();
  const tok = ledger.tokens.find((t) => t.tokenId === input.tokenId)!;
  tok.listed = true;
  tok.listedPriceAtomic = price.toString();
  tok.updatedAt = new Date().toISOString();
  ledger.activity.unshift({
    kind: "list",
    tokenId: input.tokenId,
    txId,
    actor: input.ownerLabel.trim(),
    priceAtomic: price.toString(),
    at: tok.updatedAt,
  });
  writeLedger(ledger);
  return { txId, explorerUrl: txExplorerUrl(txId) };
}

export async function cancelMoveNft(input: {
  tokenId: string;
  ownerLabel: string;
}): Promise<{ txId: string; explorerUrl: string }> {
  assertLocalOwner(input.tokenId, input.ownerLabel);
  const listingId = new Uint8Array(randomBytes(32));
  const txId = await withMoveNft(async ({ found }) => {
    const result = await found.callTx.cancel(listingId);
    return txIdOf(result);
  });

  const ledger = readLedger();
  const tok = ledger.tokens.find((t) => t.tokenId === input.tokenId);
  if (!tok) throw new Error(`token ${input.tokenId} not in local ledger`);
  tok.listed = false;
  tok.listedPriceAtomic = "0";
  tok.updatedAt = new Date().toISOString();
  ledger.activity.unshift({
    kind: "cancel",
    tokenId: input.tokenId,
    txId,
    actor: input.ownerLabel.trim(),
    at: tok.updatedAt,
  });
  writeLedger(ledger);
  return { txId, explorerUrl: txExplorerUrl(txId) };
}

export async function transferMoveNft(input: {
  tokenId: string;
  fromLabel: string;
  toLabel: string;
}): Promise<{ txId: string; explorerUrl: string }> {
  assertLocalOwner(input.tokenId, input.fromLabel);
  const buyer = ownerPkFromLabel(input.toLabel);
  const transferId = new Uint8Array(randomBytes(32));
  const txId = await withMoveNft(async ({ found }) => {
    const result = await found.callTx.transfer(transferId, buyer);
    return txIdOf(result);
  });

  const ledger = readLedger();
  const tok = ledger.tokens.find((t) => t.tokenId === input.tokenId);
  if (!tok) throw new Error(`token ${input.tokenId} not in local ledger`);
  tok.ownerLabel = input.toLabel.trim();
  tok.ownerPk = bytesToHex(buyer);
  tok.listed = false;
  tok.listedPriceAtomic = "0";
  tok.updatedAt = new Date().toISOString();
  ledger.activity.unshift({
    kind: "transfer",
    tokenId: input.tokenId,
    txId,
    actor: input.fromLabel.trim(),
    counterparty: input.toLabel.trim(),
    at: tok.updatedAt,
  });
  writeLedger(ledger);
  return { txId, explorerUrl: txExplorerUrl(txId) };
}

export async function buyMoveNft(input: {
  tokenId: string;
  buyerLabel: string;
}): Promise<{
  nftTxId: string;
  payTxId: string;
  explorerUrl: string;
  priceAtomic: string;
}> {
  const ledger = readLedger();
  const tok = ledger.tokens.find((t) => t.tokenId === input.tokenId);
  if (!tok || !tok.listed || BigInt(tok.listedPriceAtomic) <= 0n) {
    throw new Error("token is not listed");
  }
  const priceAtomic = tok.listedPriceAtomic;
  const payeePk = tok.ownerPk;

  try {
    await musdcFaucet();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!/already claimed/i.test(msg)) throw e;
  }
  const pay = await musdcTransfer({
    toHex: payeePk,
    amountAtomic: priceAtomic,
  });

  const buyer = ownerPkFromLabel(input.buyerLabel);
  // Append-only sale receipt (new map key every time).
  const saleId = new Uint8Array(randomBytes(32));
  const nftTxId = await withMoveNft(async ({ found }) => {
    const result = await found.callTx.buy(saleId, buyer);
    return txIdOf(result);
  });

  tok.ownerLabel = input.buyerLabel.trim();
  tok.ownerPk = bytesToHex(buyer);
  tok.listed = false;
  tok.listedPriceAtomic = "0";
  tok.updatedAt = new Date().toISOString();
  ledger.activity.unshift({
    kind: "buy",
    tokenId: input.tokenId,
    txId: nftTxId,
    actor: input.buyerLabel.trim(),
    counterparty: payeePk,
    priceAtomic,
    at: tok.updatedAt,
  });
  writeLedger(ledger);

  return {
    nftTxId,
    payTxId: pay.midnightTxHash,
    explorerUrl: txExplorerUrl(nftTxId),
    priceAtomic,
  };
}

export function listOwnedMoveNfts(ownerLabel: string): {
  items: Array<MoveNftRecord & { explorerUrl: string }>;
  contract: string;
  configured: boolean;
  detail: string | null;
} {
  try {
    const address = readMoveNftAddress();
    const ledger = readLedger();
    const pk = ownerPkHexFromLabel(ownerLabel);
    const items = ledger.tokens
      .filter((t) => t.ownerLabel === ownerLabel.trim() || t.ownerPk === pk)
      .map((t) => ({
        ...t,
        explorerUrl: t.mintTxId ? txExplorerUrl(t.mintTxId) : `${INDEXER_URL}#contract=${address}`,
      }));
    return { items, contract: address, configured: true, detail: null };
  } catch (e) {
    return {
      items: [],
      contract: "",
      configured: false,
      detail: e instanceof Error ? e.message : String(e),
    };
  }
}

export function listMoveNftListings(max = 48): {
  items: Array<
    MoveNftRecord & {
      price: string;
      symbol: string;
      seller: string;
      explorerUrl: string;
    }
  >;
  market: string;
  configured: boolean;
  detail: string | null;
} {
  try {
    const address = readMoveNftAddress();
    const ledger = readLedger();
    const items = ledger.tokens
      .filter((t) => t.listed && BigInt(t.listedPriceAtomic) > 0n)
      .slice(0, max)
      .map((t) => {
        const atomic = BigInt(t.listedPriceAtomic);
        const whole = atomic / 1_000_000n;
        const frac = (atomic % 1_000_000n).toString().padStart(6, "0").replace(/0+$/, "");
        const price = frac ? `${whole}.${frac}` : whole.toString();
        return {
          ...t,
          price,
          symbol: "mUSDC",
          seller: t.ownerLabel,
          explorerUrl: t.mintTxId ? txExplorerUrl(t.mintTxId) : `${INDEXER_URL}#contract=${address}`,
        };
      });
    return {
      items,
      market: address,
      configured: true,
      detail: items.length ? null : "No MoveNft listings yet — mint on /moves then list here.",
    };
  } catch (e) {
    return {
      items: [],
      market: "",
      configured: false,
      detail: e instanceof Error ? e.message : String(e),
    };
  }
}

export function listMoveNftActivity(max = 40) {
  const ledger = readLedger();
  return {
    items: ledger.activity.slice(0, max).map((a) => ({
      ...a,
      explorerUrl: txExplorerUrl(a.txId),
    })),
    contract:
      ledger.contractAddress ||
      (() => {
        try {
          return readMoveNftAddress();
        } catch {
          return "";
        }
      })(),
    indexerUrl: INDEXER_URL,
  };
}
