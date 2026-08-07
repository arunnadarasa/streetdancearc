// scripts/deploy-nft-arc.mjs — deploy Circle's audited ERC-721 SCP template
// ("StreetRail Move Rights") to Arc Testnet from the treasury wallet.
//
// Usage: node scripts/deploy-nft-arc.mjs
import fs from "node:fs";
import crypto from "node:crypto";

const API = "https://api.circle.com/v1/w3s";
const TEMPLATE_ID = "76b83278-50e2-4006-8b63-5b1a2a814533"; // ERC-721
const KEY = process.env.CIRCLE_API_KEY;
const WID = process.env.CIRCLE_TREASURY_WALLET_ID;
const ADDR = process.env.CIRCLE_TREASURY_ADDRESS;
const ES = process.env.CIRCLE_ENTITY_SECRET;

if (!KEY) { console.error("Missing CIRCLE_API_KEY"); process.exit(1); }
if (!WID || !ES || !ADDR) { console.error("Run: node scripts/bootstrap-circle.mjs"); process.exit(1); }

const H = { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

async function encryptEntitySecret() {
  const { data } = await fetch(`${API}/config/entity/publicKey`, { headers: H }).then((r) => r.json());
  const pub = crypto.createPublicKey(data.publicKey);
  return crypto.publicEncrypt(
    { key: pub, oaepHash: "sha256", padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
    Buffer.from(ES, "hex"),
  ).toString("base64");
}

const body = {
  idempotencyKey: crypto.randomUUID(),
  name: "StreetRailMoveRights",
  walletId: WID,
  blockchain: "ARC-TESTNET",
  feeLevel: "MEDIUM",
  entitySecretCiphertext: await encryptEntitySecret(),
  templateParameters: {
    name: "StreetRail Move Rights",
    symbol: "MOVE",
    defaultAdmin: ADDR,
    primarySaleRecipient: ADDR,
    royaltyRecipient: ADDR,
    royaltyPercent: 0.05,
  },
};

const res = await fetch(`${API}/templates/${TEMPLATE_ID}/deploy`, {
  method: "POST",
  headers: H,
  body: JSON.stringify(body),
}).then((r) => r.json());
console.log("Deploy response:", JSON.stringify(res, null, 2));

const contractId = res.data?.contractIds?.[0] ?? res.data?.contractId;
if (!contractId) { console.error("No contractId returned"); process.exit(1); }

let contract;
for (let i = 0; i < 90 && !contract?.contractAddress; i++) {
  await new Promise((r) => setTimeout(r, 2000));
  const poll = await fetch(`${API}/contracts/${contractId}`, { headers: H }).then((r) => r.json());
  contract = poll.data?.contract;
  if (contract?.status === "FAILED") { console.error("Deploy failed:", contract); process.exit(1); }
  if (contract?.status === "COMPLETE") break;
}

const address = contract?.contractAddress;
if (!address) { console.error("Timed out waiting for the contract address"); process.exit(1); }

fs.mkdirSync("src/data", { recursive: true });
fs.writeFileSync(
  "src/data/move-nft.json",
  JSON.stringify(
    {
      address,
      name: "StreetRail Move Rights",
      symbol: "MOVE",
      chainId: 5042002,
      explorer: "https://testnet.arcscan.app",
      templateId: TEMPLATE_ID,
      contractId,
    },
    null,
    2,
  ) + "\n",
);
console.log(`Deployed MOVE -> ${address} (https://testnet.arcscan.app/address/${address})`);
