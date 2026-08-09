import { createServerFn } from "@tanstack/react-start";
import fs from "node:fs";
import path from "node:path";

function readDeploy() {
  try {
    const p = path.resolve("src/data/midnight-contract.undeployed.json");
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    /* ignore */
  }
  return null;
}

export const getPublicConfig = createServerFn({ method: "GET" }).handler(async () => {
  const deploy = readDeploy();
  return {
    /** kept for loader compat; unused after Privy removal */
    privyAppId: "",
    treasuryAddress:
      process.env.VITE_TREASURY_LABEL ?? "streetrail:treasury:v1",
    networkId: process.env.VITE_NETWORK_ID ?? "undeployed",
    indexerUrl: process.env.VITE_INDEXER_URL ?? "http://localhost:8088/api/v4/graphql",
    proofServerUrl: process.env.VITE_PROOF_SERVER_URL ?? "http://localhost:6300",
    defaultContract:
      process.env.VITE_DEFAULT_CONTRACT ?? deploy?.address ?? "",
    musdcContract:
      process.env.VITE_MUSDC_CONTRACT ?? deploy?.contracts?.midnightUsdc?.address ?? "",
    mandateContract:
      process.env.VITE_MANDATE_CONTRACT ?? deploy?.contracts?.mandateVault?.address ?? "",
    orderContract:
      process.env.VITE_ORDER_CONTRACT ?? deploy?.contracts?.orderLedger?.address ?? "",
  };
});
