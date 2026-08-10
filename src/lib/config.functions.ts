import { createServerFn } from "@tanstack/react-start";

export const getPublicConfig = createServerFn({ method: "GET" }).handler(async () => ({
  privyAppId: process.env.PRIVY_APP_ID ?? "",
  treasuryAddress: process.env.CIRCLE_TREASURY_ADDRESS ?? "",
}));
