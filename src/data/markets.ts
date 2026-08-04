/**
 * Market data for the USDC-first thesis.
 *
 * Single source of truth: the /markets page, the judges' deck slide and the PRD
 * all read these numbers so figures cannot drift apart.
 *
 * Vintage: IMF World Economic Outlook (Apr 2024) inflation estimates,
 * Chainalysis Global Crypto Adoption Index 2023/24, World Bank KNOMAD
 * Migration & Development Brief 39. Depreciation figures are approximate
 * 3-year moves vs USD and are marked as estimates throughout.
 */

export type Market = {
  country: string;
  flag: string;
  currency: string;
  /** IMF 2024 estimate, annual CPI, percent */
  inflation: string;
  /** Approximate 3-year depreciation vs USD */
  depreciation: string;
  /** Chainalysis Global Crypto Adoption Index standing */
  cryptoIndex: string;
  population: string;
  medianAge: string;
  /** Remittance inflows as a share of GDP */
  remittances: string;
  /** What a USDC-first checkout fixes in this specific market */
  usdcFixes: string;
  /** Street dance / streetwear cultural hook */
  culture: string;
  /** Main risk to launching here */
  risk: string;
  /** Regulatory one-liner */
  regulation: string;
  ramps: string;
};

/** Top five launch markets, in priority order. */
export const launchMarkets: Market[] = [
  {
    country: "Nigeria",
    flag: "🇳🇬",
    currency: "NGN",
    inflation: "33.7%",
    depreciation: "~70%",
    cryptoIndex: "#2 globally, #1 for P2P volume",
    population: "224M",
    medianAge: "18.1",
    remittances: "~4.0% of GDP (US$20B+)",
    usdcFixes:
      "Buyers escape a 30–40% gap between the official and parallel naira rate. Creators get paid in dollars the same day instead of waiting on a bank wire that arrives devalued.",
    culture:
      "Afrobeats, legwork and Poco dance drive global TikTok trends; Ashluxe and its peers proved local appetite for premium streetwear.",
    risk: "Regulatory volatility — P2P access has been curtailed at short notice before.",
    regulation:
      "Legal to hold. SEC began licensing VASPs in 2024; banks were re-permitted but retail still runs mostly on P2P.",
    ramps: "Yellow Card, Bybit P2P, Noones",
  },
  {
    country: "Philippines",
    flag: "🇵🇭",
    currency: "PHP",
    inflation: "3.8%",
    depreciation: "~15%",
    cryptoIndex: "#6 globally",
    population: "117M",
    medianAge: "25.7",
    remittances: "~9.3% of GDP (US$39B)",
    usdcFixes:
      "Low credit-card penetration means most young buyers simply cannot check out on an international store. A USDC wallet funded from GCash removes the card requirement entirely.",
    culture:
      "Manila's competitive urban dance circuit is one of the largest in the world, with a strong affinity for US streetwear.",
    risk: "Entrenched local wallets (GCash, Maya) already own the checkout habit.",
    regulation:
      "Legal with a mature VASP framework; the central bank is openly supportive of stablecoin remittances.",
    ramps: "GCash (GCrypto), Maya, Coins.ph",
  },
  {
    country: "Argentina",
    flag: "🇦🇷",
    currency: "ARS",
    inflation: "211%",
    depreciation: "~90%+",
    cryptoIndex: "#15 globally, #1 in Latin America",
    population: "46M",
    medianAge: "31.5",
    remittances: "~0.2% of GDP",
    usdcFixes:
      "Creators here already quote in dollars. Settling royalties in USDC matches how the market actually prices work, with no FX conversion loss on either side.",
    culture: "Buenos Aires has a dense urban dance and high-fashion streetwear scene.",
    risk: "Hard FX controls on imported physical goods complicate fulfilment.",
    regulation: "Legal to grey; no specific ban and the current government is crypto-friendly.",
    ramps: "Lemon Cash, Belo, Bitso",
  },
  {
    country: "South Africa",
    flag: "🇿🇦",
    currency: "ZAR",
    inflation: "5.3%",
    depreciation: "~25%",
    cryptoIndex: "#30 globally",
    population: "60M",
    medianAge: "28.0",
    remittances: "~0.2% of GDP",
    usdcFixes:
      "Clearest regulatory footing on the continent, so it works as the compliant bridge market for pan-African payouts.",
    culture:
      "Amapiano is currently the continent's most influential cultural export, with a multi-million-dollar fashion economy attached.",
    risk: "Lower inflation makes the dollar-access argument less urgent for buyers.",
    regulation: "Legal and regulated — CASPs are licensed under the FSCA.",
    ramps: "Luno, VALR",
  },
  {
    country: "Turkey",
    flag: "🇹🇷",
    currency: "TRY",
    inflation: "69.8%",
    depreciation: "~80%",
    cryptoIndex: "#12 globally",
    population: "85M",
    medianAge: "32.2",
    remittances: "~0.1% of GDP",
    usdcFixes:
      "One of the highest stablecoin-to-fiat trade volumes on earth. Buyers hold USDC as savings; letting them spend it directly removes an extra off-ramp step.",
    culture: "Large e-commerce market and a strategic bridge into European streetwear demand.",
    risk: "The central bank bans crypto for payments — holding and trading only.",
    regulation: "Legal to hold and trade; payments explicitly prohibited.",
    ramps: "Binance TR, Paribu, BTCTurk",
  },
];

/** Wider watchlist, ranked on macro instability × crypto intensity × youth. */
export const watchlist: Array<{
  country: string;
  flag: string;
  currency: string;
  inflation: string;
  note: string;
}> = [
  { country: "Egypt", flag: "🇪🇬", currency: "EGP", inflation: "32.5%", note: "Remittances ~6% of GDP; median age 24." },
  { country: "Ghana", flag: "🇬🇭", currency: "GHS", inflation: "23.2%", note: "Sticky inflation; Free The Youth put Accra streetwear on the map." },
  { country: "Kenya", flag: "🇰🇪", currency: "KES", inflation: "5.1%", note: "M-Pesa makes USDC a natural upgrade, not a leap." },
  { country: "Pakistan", flag: "🇵🇰", currency: "PKR", inflation: "23.0%", note: "#8 on the adoption index; median age 20." },
  { country: "Vietnam", flag: "🇻🇳", currency: "VND", inflation: "4.0%", note: "#3 globally for adoption despite a stable currency." },
  { country: "Brazil", flag: "🇧🇷", currency: "BRL", inflation: "4.5%", note: "Passinho and favela funk; Pix makes it a fintech-efficiency play." },
  { country: "Colombia", flag: "🇨🇴", currency: "COP", inflation: "7.2%", note: "Remittances ~2.5% of GDP; growing urban dance scene." },
  { country: "Venezuela", flag: "🇻🇪", currency: "VED", inflation: "50%+", note: "Near-total currency collapse; stablecoins already function as money." },
  { country: "Lebanon", flag: "🇱🇧", currency: "LBP", inflation: "120%+", note: "Remittances ~28% of GDP. Macro data unreliable." },
  { country: "Ethiopia", flag: "🇪🇹", currency: "ETB", inflation: "23.3%", note: "Emerging adoption; large parallel-market premium." },
];

/** Headline sizing figures. All rough, all estimates. */
export const sizing = [
  { value: "~450M", label: "People aged 15–30 across the 15 shortlisted markets" },
  { value: "15–20M", label: "Estimated stablecoin users in the core four hubs today" },
  { value: "~US$80B", label: "Annual remittance inflows into the shortlisted markets" },
];

/** Card checkout vs USDC checkout, per rail. */
export const checkoutComparison = [
  {
    dimension: "Fees",
    card: "2.9% + fixed, plus 10–15% FX and cross-border loading in these corridors",
    usdc: "Sub-cent gas on Arc, paid in USDC itself",
  },
  {
    dimension: "Settlement",
    card: "T+2 to T+30 depending on processor and market",
    usdc: "Final in seconds",
  },
  {
    dimension: "Chargebacks",
    card: "Merchant carries the fraud risk, high in these corridors",
    usdc: "None — payment is final",
  },
  {
    dimension: "Access",
    card: "Requires an internationally-enabled card most young buyers do not hold",
    usdc: "Requires a phone and a wallet",
  },
  {
    dimension: "Creator payout",
    card: "Manual, monthly, cross-border, fee-laden",
    usdc: "Split on-chain at the moment of sale",
  },
];

export const dataNote =
  "Inflation figures are IMF World Economic Outlook (April 2024) estimates. Adoption ranks are from the Chainalysis Global Crypto Adoption Index 2023/24. Remittance shares are World Bank KNOMAD Brief 39. Depreciation figures are approximate 3-year moves against the US dollar. Treat all sizing numbers as estimates for directional use, not as audited data.";
