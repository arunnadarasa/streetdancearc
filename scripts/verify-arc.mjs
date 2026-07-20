// scripts/verify-arc.mjs — Blockscout v2 verify. NO API key. NO plugin.
import fs from "node:fs";
const addr = JSON.parse(fs.readFileSync("src/data/contract.json", "utf8")).address;
const source = fs.readFileSync(process.argv[2], "utf8");
const res = await fetch(`https://testnet.arcscan.app/api/v2/smart-contracts/${addr}/verification/via/flattened-code`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    compiler_version: "v0.8.24+commit.e11b9ed9",
    license_type: "mit",
    source_code: source,
    is_optimization_enabled: true,
    optimization_runs: 200,
    contract_name: "PaymentDanceMoveTokens",
    evm_version: "cancun",
    autodetect_constructor_args: true,
  }),
});
console.log(res.status, await res.text());
