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

// 1. Prefer an explicitly provided entity secret, then a recovery file, then generate new.
const RECOVERY = "circle-entity-recovery.json";
let entitySecret = process.env.CIRCLE_ENTITY_SECRET
                || (fs.existsSync(RECOVERY) ? JSON.parse(fs.readFileSync(RECOVERY,"utf8")).entitySecret : null)
                || crypto.randomBytes(32).toString("hex");
const provided = !!process.env.CIRCLE_ENTITY_SECRET;

// CRITICAL: persist the entity secret to disk BEFORE any network call so it
// cannot be lost if the process dies or registration succeeds silently.
fs.writeFileSync(RECOVERY, JSON.stringify({
  entitySecret,
  warning: "Keep safe. Circle never reveals this again.",
  savedAt: new Date().toISOString(),
}, null, 2));
console.log("Entity secret saved to", RECOVERY, "(pre-registration).");

// 2. RSA-OAEP-SHA256 encrypt with Circle's public key and register.
const { data: { publicKey } } = await fetch(`${API}/config/entity/publicKey`, { headers: H }).then(r => r.json());
const ciphertext = crypto.publicEncrypt(
  { key: crypto.createPublicKey(publicKey), oaepHash: "sha256", padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
  Buffer.from(entitySecret, "hex")
).toString("base64");
const reg = await fetch(`${API}/config/entity/entitySecret`, {
  method: "POST", headers: H, body: JSON.stringify({ entitySecretCiphertext: ciphertext })
});
if (reg.status !== 200 && reg.status !== 201 && reg.status !== 409) {
  const text = await reg.text();
  console.error("register failed", reg.status, text); process.exit(1);
}
if (reg.status === 409) {
  if (provided) {
    console.log("Entity secret already registered; using the provided CIRCLE_ENTITY_SECRET.");
  } else {
    console.error(`
This Circle API key already has an entity secret registered, and Circle never reveals it again.
To continue you have two options:

1. Provide the existing entity secret:
   CIRCLE_ENTITY_SECRET=<hex> node scripts/bootstrap-circle.mjs

2. Use a fresh Circle API key (generate a new one in the Circle Developer Console),
   update Project Settings -> Secrets with the new CIRCLE_API_KEY, then re-run this script.
`);
    process.exit(1);
  }
}
const regJson = await reg.json().catch(() => ({}));
const recoveryFile = regJson.data?.recoveryFile;
fs.writeFileSync(RECOVERY, JSON.stringify({
  entitySecret,
  ...(recoveryFile ? { recoveryFile } : {}),
  warning: "Keep safe. Circle never reveals this again."
}, null, 2));

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
if (!setRes.data?.walletSet?.id) { console.error("wallet set create failed", JSON.stringify(setRes)); process.exit(1); }
const walletSetId = setRes.data.walletSet.id;
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
