#!/usr/bin/env bun
// Deploy StreetRail Compact contracts to local Undeployed.
//   VITE_NETWORK_ID=undeployed bun scripts/deploy-midnight.mjs
import fs from "node:fs";
import path from "node:path";
import { deployContract } from "@midnight-ntwrk/midnight-js-contracts";
import {
  buildCompiledContract,
  buildUndeployedProviders,
  initialPrivateStateFor,
} from "../src/lib/midnight-providers.server.ts";
import {
  CONTRACTS,
  PRIVATE_STATE_ID,
  deployerSecretBytes,
} from "../src/lib/midnight-shared.ts";

const NET = process.env.VITE_NETWORK_ID ?? "undeployed";
if (NET !== "undeployed") {
  console.error("This script currently supports VITE_NETWORK_ID=undeployed only");
  process.exit(1);
}

const secret = deployerSecretBytes();
const deployed = {};

for (const [key, meta] of Object.entries(CONTRACTS)) {
  console.log(`\n→ Deploying ${meta.name} (${key})…`);
  const compiledContract = await buildCompiledContract({
    contractName: meta.name,
    secretForDeploy: secret,
  });
  const { providers, midnightWallet } = await buildUndeployedProviders({
    contractName: meta.name,
  });

  let result;
  for (let i = 0; i < 8; i++) {
    try {
      result = await deployContract(providers, {
        compiledContract,
        privateStateId: `${PRIVATE_STATE_ID}-${meta.name}`,
        initialPrivateState: initialPrivateStateFor(meta.name, secret),
      });
      break;
    } catch (e) {
      if (i === 7) throw e;
      console.warn(`  Deploy attempt ${i + 1} failed: ${e.message}. Retrying in 10s…`);
      await new Promise((r) => setTimeout(r, 10000));
    }
  }

  const address = result.deployTxData.public.contractAddress;
  deployed[key] = {
    name: meta.name,
    address,
    deployTx: result.deployTxData.public.txHash ?? result.deployTxData.public.txId,
    privateStateId: `${PRIVATE_STATE_ID}-${meta.name}`,
  };
  console.log(`  ✓ ${meta.name} @ ${address}`);
  await midnightWallet.stop().catch(() => {});
}

const out = {
  network: NET,
  deployedAt: new Date().toISOString(),
  // Convenience aliases used by the UI / settle path
  address: deployed.moveRegistry.address,
  privateStateId: deployed.moveRegistry.privateStateId,
  contracts: deployed,
};
const outPath = `src/data/midnight-contract.${NET}.json`;
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));

// Also write placeholder-friendly primary file
fs.writeFileSync(
  "src/data/midnight-contract.json",
  JSON.stringify(
    {
      network: NET,
      address: out.address,
      contracts: deployed,
      deployedAt: out.deployedAt,
    },
    null,
    2,
  ),
);

// Patch .env VITE_* for local dev
const envPath = ".env";
const envLines = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8").split("\n") : [];
const upsert = (key, value) => {
  const i = envLines.findIndex((l) => l.startsWith(`${key}=`));
  const line = `${key}=${value}`;
  if (i >= 0) envLines[i] = line;
  else envLines.push(line);
};
upsert("VITE_NETWORK_ID", "undeployed");
upsert("VITE_INDEXER_URL", "http://localhost:8088/api/v4/graphql");
upsert("VITE_INDEXER_WS_URL", "ws://localhost:8088/api/v4/graphql/ws");
upsert("VITE_PROOF_SERVER_URL", "http://localhost:6300");
upsert("VITE_NODE_URL", "http://localhost:9944");
upsert("VITE_NODE_WS", "ws://localhost:9944");
upsert("VITE_DEFAULT_CONTRACT", out.address);
if (deployed.midnightUsdc) upsert("VITE_MUSDC_CONTRACT", deployed.midnightUsdc.address);
if (deployed.mandateVault) upsert("VITE_MANDATE_CONTRACT", deployed.mandateVault.address);
if (deployed.orderLedger) upsert("VITE_ORDER_CONTRACT", deployed.orderLedger.address);
if (deployed.moveNft) upsert("VITE_MOVE_NFT_CONTRACT", deployed.moveNft.address);
fs.writeFileSync(envPath, envLines.filter((l, idx, arr) => l || idx < arr.length - 1).join("\n") + "\n");

// Fresh MoveNft mirror for the new deploy address
if (deployed.moveNft) {
  const nftState = "src/data/move-nft-state.undeployed.json";
  fs.writeFileSync(
    nftState,
    JSON.stringify(
      { contractAddress: deployed.moveNft.address, tokens: [], activity: [] },
      null,
      2,
    ),
  );
  console.log(`  ✓ reset ${nftState}`);
}

console.log(`\n✓ wrote ${outPath}`);
console.log(`  primary MoveRegistry: ${out.address}`);
process.exit(0);
