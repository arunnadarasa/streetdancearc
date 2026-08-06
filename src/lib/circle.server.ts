// Server-only Circle developer-controlled wallet client.
//
// The Rights Agent uses this to move value from the funded Arc treasury wallet
// WITHOUT the human signing anything — that is the whole point of A2H.
//
// Every request re-encrypts the entity secret against a freshly fetched Circle
// public key; Circle rejects reused ciphertext.

const API = "https://api.circle.com/v1/w3s";
const BLOCKCHAIN = "ARC-TESTNET";

export interface CircleTx {
  id: string;
  state: string;
  txHash?: string;
}

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`missing_secret:${name}`);
  return v;
}

function headers() {
  return {
    Authorization: `Bearer ${env("CIRCLE_API_KEY")}`,
    "Content-Type": "application/json",
  };
}

function pemToDer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i += 1) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/** RSA-OAEP(SHA-256) encrypt the 32-byte entity secret — fresh for every call. */
async function entitySecretCiphertext(): Promise<string> {
  const res = await fetch(`${API}/config/entity/publicKey`, { headers: headers() });
  if (!res.ok) throw new Error(`circle_public_key_failed:${res.status}`);
  const json = (await res.json()) as { data?: { publicKey?: string } };
  const pem = json.data?.publicKey;
  if (!pem) throw new Error("circle_public_key_missing");

  const key = await crypto.subtle.importKey(
    "spki",
    pemToDer(pem),
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"],
  );
  const secret = hexToBytes(env("CIRCLE_ENTITY_SECRET"));
  const cipher = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, key, secret as BufferSource);
  let bin = "";
  new Uint8Array(cipher).forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin);
}

async function post(path: string, body: Record<string, unknown>): Promise<CircleTx> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      idempotencyKey: crypto.randomUUID(),
      entitySecretCiphertext: await entitySecretCiphertext(),
      walletId: env("CIRCLE_TREASURY_WALLET_ID"),
      fee: { type: "level", config: { feeLevel: "MEDIUM" } },
      ...body,
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`circle_${path.split("/").pop()}_failed:${res.status}:${text.slice(0, 300)}`);
  const json = JSON.parse(text) as { data?: { id?: string; state?: string } };
  const id = json.data?.id;
  if (!id) throw new Error("circle_no_transaction_id");
  return { id, state: json.data?.state ?? "INITIATED" };
}

/** Poll until Circle reports a chain hash (or the transaction fails). */
export async function waitForTx(id: string, timeoutMs = 90_000): Promise<CircleTx> {
  const deadline = Date.now() + timeoutMs;
  let last: CircleTx = { id, state: "INITIATED" };
  while (Date.now() < deadline) {
    const res = await fetch(`${API}/transactions/${id}`, { headers: headers() });
    if (res.ok) {
      const json = (await res.json()) as {
        data?: { transaction?: { state?: string; txHash?: string; errorReason?: string } };
      };
      const t = json.data?.transaction;
      last = { id, state: t?.state ?? last.state, txHash: t?.txHash };
      if (t?.state === "FAILED" || t?.state === "CANCELLED" || t?.state === "DENIED") {
        throw new Error(`circle_tx_${t.state.toLowerCase()}:${t.errorReason ?? "unknown"}`);
      }
      if (last.txHash && (last.state === "CONFIRMED" || last.state === "COMPLETE" || last.state === "SENT")) {
        return last;
      }
    }
    await new Promise((r) => setTimeout(r, 2500));
  }
  throw new Error(`circle_tx_timeout:${last.state}`);
}

/**
 * Send value from the treasury wallet.
 * `tokenAddress` is omitted for Arc's native gas token (USDC).
 */
export async function treasuryTransfer(params: {
  to: string;
  amount: string;
  tokenAddress?: string;
}): Promise<CircleTx> {
  const body: Record<string, unknown> = {
    destinationAddress: params.to,
    amounts: [params.amount],
    blockchain: BLOCKCHAIN,
  };
  if (params.tokenAddress) body["tokenAddress"] = params.tokenAddress;
  const tx = await post("/developer/transactions/transfer", body);
  return waitForTx(tx.id);
}

/** Call an arbitrary contract function from the treasury wallet. */
export async function treasuryContractCall(params: {
  contractAddress: string;
  abiFunctionSignature: string;
  abiParameters: unknown[];
}): Promise<CircleTx> {
  const tx = await post("/developer/transactions/contractExecution", {
    contractAddress: params.contractAddress,
    abiFunctionSignature: params.abiFunctionSignature,
    abiParameters: params.abiParameters,
  });
  return waitForTx(tx.id);
}

export const TREASURY_ADDRESS = () => process.env["CIRCLE_TREASURY_ADDRESS"] ?? "";
