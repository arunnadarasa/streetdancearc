// @lovable.dev/vite-tanstack-config already includes TanStack/React/tailwind/nitro plugins.
import path from "node:path";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import type { Plugin } from "vite";

function clientTopLevelAwait(): Plugin {
  return { ...topLevelAwait(), applyToEnvironment: (env) => env.name === "client" };
}

function midnightSsrStub(): Plugin {
  const wasmStub = path.resolve("src/lib/midnight-ssr-stub.ts");
  const swaps: Array<[string, string]> = [
    [path.resolve("src/lib/append-entry.server.ts"), path.resolve("src/lib/append-entry.ssr-stub.ts")],
    [path.resolve("src/lib/anchor-mandate.server.ts"), path.resolve("src/lib/anchor-mandate.ssr-stub.ts")],
    [path.resolve("src/lib/musdc.server.ts"), path.resolve("src/lib/musdc.ssr-stub.ts")],
    [path.resolve("src/lib/record-order.server.ts"), path.resolve("src/lib/record-order.ssr-stub.ts")],
    [path.resolve("src/lib/move-nft.server.ts"), path.resolve("src/lib/move-nft.ssr-stub.ts")],
    [path.resolve("src/lib/midnight-providers.server.ts"), wasmStub],
  ];
  return {
    name: "midnight-ssr-stub",
    apply: "build",
    enforce: "pre",
    async resolveId(id, importer, options) {
      if (!options?.ssr) return;
      if (id.startsWith("@midnight-ntwrk/")) return wasmStub;
      const resolved = await this.resolve(id, importer, { ...options, skipSelf: true });
      if (!resolved) return null;
      for (const [real, stub] of swaps) {
        if (resolved.id === real) return stub;
      }
      return resolved;
    },
  };
}

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    plugins: [midnightSsrStub(), wasm(), clientTopLevelAwait()],
    build: {
      target: "esnext",
      commonjsOptions: { transformMixedEsModules: true, defaultIsModuleExports: "auto" },
    },
    optimizeDeps: {
      noDiscovery: true,
      include: ["buffer"],
      esbuildOptions: { target: "esnext", supported: { "top-level-await": true } },
      exclude: [
        "@midnight-ntwrk/compact-runtime",
        "@midnight-ntwrk/onchain-runtime-v3",
        "@midnight-ntwrk/midnight-js-contracts",
        "@midnight-ntwrk/midnight-js-http-client-proof-provider",
        "@midnight-ntwrk/midnight-js-indexer-public-data-provider",
        "@midnight-ntwrk/midnight-js-fetch-zk-config-provider",
        "@midnight-ntwrk/midnight-js-network-id",
        "@midnight-ntwrk/midnight-js-utils",
        "@midnight-ntwrk/midnight-js-node-zk-config-provider",
        "@midnight-ntwrk/midnight-js-level-private-state-provider",
        "@midnight-ntwrk/dapp-connector-api",
        "@midnight-ntwrk/testkit-js",
        "@midnight-ntwrk/wallet-sdk",
        "pino",
        "ws",
        "ssh2",
        "cpu-features",
      ],
    },
  },
});
