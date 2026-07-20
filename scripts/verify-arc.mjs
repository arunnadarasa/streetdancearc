// scripts/verify-arc.mjs — Blockscout REST verify. NO API key. NO plugin.
import fs from "node:fs";
const addr = JSON.parse(fs.readFileSync("src/data/contract.json", "utf8")).address;
const source = fs.readFileSync(process.argv[2], "utf8");
const form = new FormData();
form.append("compiler_version",  "v0.8.24+commit.e11b9ed9");
form.append("license_type",      "mit");
form.append("optimization",      "true");
form.append("optimization_runs", "200");
form.append("source_code",       source);
const res = await fetch(`https://testnet.arcscan.app/api/v2/smart-contracts/${addr}/verification/via/flattened-code`,
  { method: "POST", body: form });
console.log(res.status, await res.text());
