// scripts/bootstrap-circle.mjs
// MANDATORY first step. Runs once in the Lovable sandbox. Idempotent.
// Uses CIRCLE_API_KEY to (1) generate + register CIRCLE_ENTITY_SECRET,
// (2) create the ARC-TESTNET developer-controlled treasury wallet,
// (3) print all three values for the participant to paste into Project Settings -> Secrets.
import crypto from "node:crypto"; import fs from "node:fs";

const API = "https://api.circle.com/v1/w3s";
const KEY = process.env.CIRCLE_API_KEY;
if (!KEY) { console.error("Paste CIRCLE_API_KEY first (Project Settings -> Secrets)."); process.exit(1); }
const H = { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

// 1. Reuse an existing recovery file if present (re-runs after a remix).
const RECOVERY = "circle-entity-recovery.json";
let entitySecret = fs.existsSync(RECOVERY) ? JSON.parse(fs.readFileSync(RECOVERY,"utf8")).entitySecret
                                           : crypto.randomBytes(32).toString("hex");

// 2. RSA-OAEP-SHA256 encrypt with Circle's public key and register (409 = already registered, OK).
const { data: { publicKey } } = await fetch(`${API}/config/entity/publicKey`, { headers: H }).then(r => r.json());
const ciphertext = crypto.publicEncrypt(
  { key: crypto.createPublicKey(publicKey), oaepHash: "sha256", padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
  Buffer.from(entitySecret, "hex")
).toString("base64");
const reg = await fetch(`${API}/config/entity/entitySecret`, {
  method: "POST", headers: H, body: JSON.stringify({ entitySecretCiphertext: ciphertext })
});
if (reg.status !== 200 && reg.status !== 201 && reg.status !== 409) { console.error("register failed", reg.status, await reg.text()); process.exit(1); }
const regJson = await reg.json().catch(() => ({}));
if (regJson.data?.recoveryFile) {
  fs.writeFileSync(RECOVERY, JSON.stringify({ entitySecret, recoveryFile: regJson.data.recoveryFile, warning: "Keep safe. Circle never reveals this again." }, null, 2));
} else {
fs.writeFileSync(RECOVERY, JSON.stringify({ entitySecret, warning: "Keep safe. Circle never reveals this again." }, null, 2));

// 3. Create treasury wallet on ARC-TESTNET.
const idempotencyKey = crypto.randomUUID();
const freshCipher = crypto.publicEncrypt(
  { key: crypto.createPublicKey(publicKey), oaepHash: "sha256", padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
  Buffer.from(entitySecret, "hex")
).toString("base64");
const setRes = await fetch(`${API}/developer/walletSets`, {
  method: "POST", headers: H,
  body: JSON.stringify({ idempotencyKey, entitySecretCiphertext: freshCipher, name: "arc-treasury" })
}).then(r => r.json());
const walletSetId = setRes.data?.walletSet?.id;
const walletCipher = crypto.publicEncrypt(
  { key: crypto.createPublicKey(publicKey), oaepHash: "sha256", padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
  Buffer.from(entitySecret, "hex")
).toString("base64");
const walletRes = await fetch(`${API}/developer/wallets`, {
  method: "POST", headers: H,
  body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), entitySecretCiphertext: walletCipher,
                          walletSetId, blockchains: ["ARC-TESTNET"], count: 1, accountType: "EOA" })
}).then(r => r.json());
const wallet = walletRes.data?.wallets?.[0];
if (!wallet) { console.error("wallet create failed", JSON.stringify(walletRes)); process.exit(1); }

console.log("\n=== PASTE THESE INTO Project Settings -> Secrets ===\n");
console.log("CIRCLE_ENTITY_SECRET         =", entitySecret);
console.log("CIRCLE_TREASURY_WALLET_ID    =", wallet.id);
console.log("VITE_CIRCLE_TREASURY_ADDRESS =", wallet.address);
console.log(`\nThen fund the address at https://faucet.circle.com/ (USDC gas + EURC + cirBTC on Arc Testnet).`);
console.log(`Address: ${wallet.address}`);
