// scripts/deploy-arc.mjs — compile with solc, deploy via Circle SCP (USDC gas).
import fs from "node:fs"; import crypto from "node:crypto"; import solc from "solc";

const API   = "https://api.circle.com/v1/w3s";
const KEY   = process.env.CIRCLE_API_KEY;
const WID   = process.env.CIRCLE_TREASURY_WALLET_ID;
const ES    = process.env.CIRCLE_ENTITY_SECRET;
if (!KEY) { console.error("Missing CIRCLE_API_KEY"); process.exit(1); }
if (!WID || !ES) { console.error("Run: node scripts/bootstrap-circle.mjs"); process.exit(1); }
const H = { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

async function encryptEntitySecret() {
  const { data } = await fetch(`${API}/config/entity/publicKey`, { headers: H }).then(r => r.json());
  const pub = crypto.createPublicKey(data.publicKey);
  return crypto.publicEncrypt(
    { key: pub, oaepHash: "sha256", padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
    Buffer.from(ES, "hex")
  ).toString("base64");
}

function compile(name) {
  const source = fs.readFileSync(`contracts/${name}.sol`, "utf8");
  const input = { language: "Solidity", sources: { [`${name}.sol`]: { content: source } },
    settings: { optimizer: { enabled: true, runs: 200 },
      outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } } } };
  const out = JSON.parse(solc.compile(JSON.stringify(input)));
  const c = out.contracts[`${name}.sol`][name] ?? out.contracts[`${name}.sol`][`Payment${name}`];
  return { abi: c.abi, bytecode: "0x" + c.evm.bytecode.object };
}

const [, , nameArg, ...ctorArgs] = process.argv;
const name = nameArg ?? "DanceMoveTokens";
const { abi, bytecode } = compile(name);
const ctor = abi.find(x => x.type === "constructor");
const sig  = ctor ? `constructor(${ctor.inputs.map(i => i.type).join(",")})` : "constructor()";

const body = { walletId: WID, blockchain: "ARC-TESTNET", name, bytecode,
  abiFunctionSignature: sig, abiParameters: ctorArgs,
  entitySecretCiphertext: await encryptEntitySecret(),
  fee: { type: "level", config: { feeLevel: "MEDIUM" } } };
const { data: { contractId } } = await fetch(`${API}/contracts/deploy`,
  { method: "POST", headers: H, body: JSON.stringify(body) }).then(r => r.json());

let addr;
for (let i = 0; i < 60 && !addr; i++) {
  await new Promise(r => setTimeout(r, 2000));
  const { data: { contract } } = await fetch(`${API}/contracts/${contractId}`, { headers: H }).then(r => r.json());
  if (contract.state === "COMPLETE") addr = contract.contractAddress;
}
fs.mkdirSync("src/data", { recursive: true });
fs.writeFileSync("src/data/contract.json", JSON.stringify({ address: addr, abi, chainId: 5042002, explorer: "https://testnet.arcscan.app" }, null, 2));
console.log(`Deployed ${name} -> ${addr} (https://testnet.arcscan.app/address/${addr})`);
