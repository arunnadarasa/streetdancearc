// scripts/verify-arc.mjs — Blockscout standard-JSON verify. NO API key. NO plugin.
//
//   node scripts/verify-arc.mjs contracts/DanceMoveTokens.sol
//   node scripts/verify-arc.mjs contracts/StreetRailAuthorizer.sol src/data/street-rail-authorizer.json StreetRailAuthorizer
import fs from "node:fs";
import solc from "solc";

const sourcePath = process.argv[2] ?? "contracts/DanceMoveTokens.sol";
const dataPath = process.argv[3] ?? "src/data/contract.json";
const contractName = process.argv[4] ?? "PaymentDanceMoveTokens";
const fileName = sourcePath.split("/").pop();

const addr = JSON.parse(fs.readFileSync(dataPath, "utf8")).address;
const source = fs.readFileSync(sourcePath, "utf8");
const compilerversion = "v" + solc.version().split(".Emscripten")[0];
const input = JSON.stringify({
  language: "Solidity",
  sources: { [fileName]: { content: source } },
  settings: { optimizer: { enabled: true, runs: 200 }, outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } } },
});
const params = new URLSearchParams({
  module: "contract",
  action: "verifysourcecode",
  contractaddress: addr,
  contractname: `${fileName}:${contractName}`,
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
