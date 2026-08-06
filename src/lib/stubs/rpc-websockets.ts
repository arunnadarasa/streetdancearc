// Worker-safe stub for `rpc-websockets`.
//
// Circle's App Kits (@circle-fin/swap-kit, unified-balance-kit, x402-batching)
// pull in @solana/web3.js, which depends on `rpc-websockets`. That package has
// no "workerd"/"worker" condition in its exports map, so the Cloudflare build
// fails to resolve it. StreetRail settles on Arc only and never touches the
// Solana websocket subscription paths, so we alias them to throwing no-ops.

function unsupported(): never {
  throw new Error(
    "rpc-websockets is not supported in the Worker runtime (Solana subscriptions are unused on Arc).",
  );
}

export class Client {
  constructor() {
    unsupported();
  }
}

export class CommonClient extends Client {}
export class WebSocket extends Client {}

export default Client;
