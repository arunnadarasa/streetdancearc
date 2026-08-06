// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { fileURLToPath } from "node:url";

const rpcWebsocketsStub = fileURLToPath(
  new URL("./src/lib/stubs/rpc-websockets.ts", import.meta.url),
);

const coralAnchorStub = fileURLToPath(
  new URL("./src/lib/stubs/coral-anchor.ts", import.meta.url),
);

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    resolve: {
      alias: [
        // @solana/web3.js (dragged in by Circle App Kits) requires `rpc-websockets`,
        // which has no workerd export condition. Arc settlement never uses it.
        { find: /^rpc-websockets$/, replacement: rpcWebsocketsStub },
        { find: /^rpc-websockets\/.*/, replacement: rpcWebsocketsStub },
        // @coral-xyz/anchor (via @circle-fin/swap-kit) ends its ESM build with a
        // CommonJS-only `exports.workspace = ...` branch that runs whenever
        // `isBrowser` is false — i.e. in the Worker — throwing
        // "ReferenceError: exports is not defined" on every SSR request.
        { find: /^@coral-xyz\/anchor$/, replacement: coralAnchorStub },
        { find: /^@coral-xyz\/anchor\/.*/, replacement: coralAnchorStub },
      ],
    },
  },
});


