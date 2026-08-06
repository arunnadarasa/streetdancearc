// Worker-safe stub for `@coral-xyz/anchor`.
//
// Circle's swap-kit pulls in the Solana Anchor SDK. Anchor's ESM build ends
// with a CommonJS-only branch:
//
//   if (!isBrowser) { exports.workspace = ...; exports.Wallet = ...; }
//
// In the Cloudflare Worker `isBrowser` is false and `exports` does not exist,
// so the module throws `ReferenceError: exports is not defined` at import time
// and every SSR request 500s. StreetRail settles on Arc only and never uses
// Anchor / Solana programs, so the whole package is aliased to this no-op.

function unsupported(): never {
  throw new Error(
    "@coral-xyz/anchor is not supported in the Worker runtime (Solana programs are unused on Arc).",
  );
}

export const workspace = {} as Record<string, never>;

export class Wallet {
  constructor() {
    unsupported();
  }
}

export class Program extends Wallet {}
export class AnchorProvider extends Wallet {}
export class BN extends Wallet {}

export const web3 = {} as Record<string, never>;
export const utils = {} as Record<string, never>;

export default { workspace, Wallet, Program, AnchorProvider, web3, utils };
