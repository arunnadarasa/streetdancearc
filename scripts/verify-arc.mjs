// scripts/verify-arc.mjs — Blockscout standard-JSON verify. NO API key. NO plugin.
import fs from "node:fs";
import solc from "solc";
const addr = JSON.parse(fs.readFileSync("src/data/contract.json", "utf8")).address;
const source = fs.readFileSync(process.argv[2], "utf8");
const compilerversion = "v" + solc.version().split(".Emscripten")[0];
const input = JSON.stringify({
  language: "Solidity",
  sources: { "DanceMoveTokens.sol": { content: source } },
  settings: { optimizer: { enabled: true, runs: 200 }, outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } } },
});
const params = new URLSearchParams({
  module: "contract",
  action: "verifysourcecode",
  contractaddress: addr,
  contractname: "DanceMoveTokens.sol:PaymentDanceMoveTokens",
  compilerversion,
  optimizationUsed: "1",
  runs: "200",
  sourceCode: input,
  codeformat: "solidity-standard-json-input",
  licenseType: "3",
  constructorArguments: "",
  autodetectConstructorArguments: "true",
});
const res = await fetch("https://testnet.arcscan.app/api?" + params.toString(), { method: "POST" });
console.log(res.status, await res.text());
