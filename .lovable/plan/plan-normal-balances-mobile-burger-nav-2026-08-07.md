# Plan: Normal Balances + Mobile Burger Nav

## Goal
Fix the wallet balance so it reads in normal human units (e.g. 18.73 USDC) instead of the current oversized "micro" display, and replace the cramped mobile horizontal-scroll nav with a hamburger menu that opens a full navigation sheet.

## Verified current state
- `src/lib/use-arc-balances.ts` reads native USDC via `eth_getBalance` and converts with `fromAtomic(..., "USDC")` using 6 decimals.
- A test with the value seen in the screenshot (`18728664128067600000`) divided by 10^6 produces exactly the buggy display (`18728664128067.60`).
- The RPC is therefore returning native USDC in 18-decimal atomic units, not 6-decimal units.
- `src/components/dance/Header.tsx` renders the mobile nav as a horizontally scrolling pill list, which is cramped and hides items.
- `src/components/ui/sheet.tsx` exists and can be used for the mobile drawer.

## Changes

### 1. Fix Arc USDC balance display
File: `src/lib/use-arc-balances.ts`

- Change `readBalance` for the native USDC case to use the ERC-20 `balanceOf` call against the USDC contract address (`0x3600...`) instead of `eth_getBalance`.
- `balanceOf` on Arc returns 6-decimal atomic units, so `fromAtomic` will correctly produce normal USDC amounts.
- Keep EURC and cirBTC on their existing ERC-20 `balanceOf` paths.
- Add a small unit test or inline Node assertion to verify `fromAtomic`/`toAtomic` round-trip for USDC, EURC and cirBTC.

### 2. Mobile hamburger navigation
File: `src/components/dance/Header.tsx`

- Replace the horizontal-scroll mobile nav bar with a hamburger button (`Menu` icon from `lucide-react`) that opens a `Sheet` drawer from the right.
- Inside the sheet, list the same `NAV` links as large tappable rows with active-state highlighting.
- Include `ModeToggle` and `PayTokenToggle` inside the sheet so mobile users can switch modes and currency without hunting for the small pills.
- Keep the desktop horizontal nav unchanged.
- Ensure the sheet closes automatically when a link is tapped.

## Opinion on the two Circle links

1. **Gateway ERC-1271 support** — directly useful for StreetRail's treasury/agent flows. ERC-1271 lets a smart contract wallet (or a Circle programmable wallet acting through contract logic) sign/authorize Gateway operations. For A2H/A2A payouts, this could remove the need for a hot EOA delegate and let the payout agent authorize cross-chain USDC rebalancing programmatically. Worth watching, but not a near-term code change unless we move from SCP wallets to Gateway-based liquidity.

2. **Agent Marketplace Discovery API** — highly relevant to the A2A and A2H modes. Today the x402 endpoint is hardcoded. The Discovery API (`GET /v2/x402/discovery/resources`) is public, keyless, and returns compliant, live x402 services. We could replace the static config with a discovered resource list, letting the agent pick a payment rail by network/price/category. This is a stronger near-term fit than ERC-1271 and would make the "agent negotiates" page more credible to judges.

## Risks
- If the USDC contract `balanceOf` on Arc returns the same 18-decimal value as `eth_getBalance`, the fix needs a fallback divisor of 10^18 for native balance. I will add a guard that detects values larger than a sensible faucet cap and re-divides by 10^12 as a safety net.
- The hamburger sheet must not duplicate the wallet dropdown logic; it should only expose navigation, mode and currency toggles.

## Success criteria
- Wallet chip and balance panel show USDC in normal units (e.g. 18.73 USDC, not 18728664128067.60).
- EURC and cirBTC balances remain correct.
- On mobile, tapping the hamburger opens a clean sheet with all nav links; tapping a link navigates and closes the sheet.
