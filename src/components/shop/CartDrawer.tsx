import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Minus, Plus, Trash2, ExternalLink, Loader2, Zap } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import { usePayToken } from "@/lib/pay-token";
import { useWallet } from "@/lib/wallet-context";
import { settleOnArc, settlementNote } from "@/lib/settle";
import { DEMO_SCALE } from "@/lib/agent-card";
import { TOKENS, formatAmount, toAtomic, convertFromFiat, type FxRates } from "@/lib/tokens";
import type { Address } from "viem";
import { getPublicConfig } from "@/lib/config.functions";
import { useServerFn } from "@tanstack/react-start";
import { fetchFxRates } from "@/lib/fx.functions";
import { LiveTotalCalculator } from "@/components/fx/LiveTotalCalculator";


export function CartDrawer() {
  const [open, setOpen] = useState(false);
  const {
    items,
    isLoading,
    isSyncing,
    updateQuantity,
    removeItem,
    getCheckoutUrl,
    syncCart,
  } = useCartStore();
  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = items.reduce(
    (s, i) => s + parseFloat(i.price.amount) * i.quantity,
    0,
  );

  useEffect(() => {
    if (open) syncCart();
  }, [open, syncCart]);

  const [payToken] = usePayToken();
  const tokenCfg = TOKENS[payToken];
  const { authenticated, login, wallets, available } = useWallet();
  const [treasury, setTreasury] = useState("");
  const [fx, setFx] = useState<FxRates | null>(null);
  const getFx = useServerFn(fetchFxRates);

  const [arcState, setArcState] = useState<
    { phase: "idle" } | { phase: "paying" } | { phase: "paid"; url: string; amount: string } | { phase: "error"; message: string }
  >({ phase: "idle" });

  // Live FX: convert the listed GBP total into the selected token's atomic units.
  const currencyCode = items[0]?.price.currencyCode ?? "GBP";
  const arcAtomic = toAtomic(
    convertFromFiat(totalPrice * DEMO_SCALE, currencyCode, payToken, fx),
    payToken,
  );

  useEffect(() => {
    if (open) syncCart();
  }, [open, syncCart]);

  useEffect(() => {
    if (!open || treasury) return;
    void getPublicConfig().then((c) => setTreasury(c.treasuryAddress));
  }, [open, treasury]);

  useEffect(() => {
    let mounted = true;
    void getFx({ data: undefined }).then((rates) => {
      if (mounted) setFx(rates);
    });
    return () => { mounted = false; };
  }, [getFx]);

  const handleCheckout = () => {
    const url = getCheckoutUrl();
    if (url) {
      window.open(url, "_blank");
      setOpen(false);
    }
  };

  const handlePayOnArc = async () => {
    if (!authenticated) {
      await login();
      return;
    }
    if (!treasury) {
      setArcState({ phase: "error", message: "No merchant treasury address configured." });
      return;
    }
    const embedded = wallets.find((w) => w.walletClientType === "privy") ?? wallets[0];
    if (!embedded?.address) {
      setArcState({ phase: "error", message: "No embedded wallet available." });
      return;
    }
    setArcState({ phase: "paying" });
    try {
      const res = await settleOnArc(
        embedded as Parameters<typeof settleOnArc>[0],
        payToken,
        treasury as Address,
        arcAtomic,
      );
      setArcState({
        phase: "paid",
        url: res.explorer,
        amount: formatAmount(arcAtomic, payToken),
      });
    } catch (e) {
      setArcState({ phase: "error", message: e instanceof Error ? e.message : String(e) });
    }
  };


  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative border-border bg-surface text-foreground hover:bg-secondary"
        >
          <ShoppingCart className="h-5 w-5" />
          {totalItems > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-primary text-primary-foreground">
              {totalItems}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg flex flex-col h-full bg-surface-2 text-foreground border-border">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle className="text-foreground">Your Cart</SheetTitle>
          <SheetDescription className="text-muted-foreground">
            {totalItems === 0
              ? "Your cart is empty"
              : `${totalItems} item${totalItems !== 1 ? "s" : ""} in your cart`}
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col flex-1 pt-6 min-h-0">
          {items.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Your cart is empty</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto pr-2 min-h-0">
                <div className="space-y-4">
                  {items.map((item) => {
                    const img = item.product.node.images?.edges?.[0]?.node;
                    return (
                      <div key={item.variantId} className="flex gap-4 p-2">
                        <div className="w-16 h-16 bg-secondary rounded-md overflow-hidden flex-shrink-0">
                          {img && (
                            <img
                              src={img.url}
                              alt={item.product.node.title}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate text-foreground">
                            {item.product.node.title}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {item.selectedOptions.map((o) => o.value).join(" • ")}
                          </p>
                          <p className="font-semibold text-glow">
                            {item.price.currencyCode}{" "}
                            {parseFloat(item.price.amount).toFixed(2)}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => removeItem(item.variantId)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 border-border bg-surface"
                              onClick={() =>
                                updateQuantity(item.variantId, item.quantity - 1)
                              }
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </Button>
                            <span className="w-6 text-center text-sm">
                              {item.quantity}
                            </span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 border-border bg-surface"
                              onClick={() =>
                                updateQuantity(item.variantId, item.quantity + 1)
                              }
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="flex-shrink-0 space-y-3 pt-4 border-t border-border">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total</span>
                  <span className="text-xl font-black text-glow">
                    {items[0]?.price.currencyCode || "£"} {totalPrice.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-baseline justify-between rounded-lg border border-border bg-surface px-3 py-2 text-xs">
                  <span className="text-muted-foreground">
                    Pay on Arc in <span className="font-bold text-foreground">{tokenCfg.symbol}</span>
                    {fx && (
                      <span className="ml-1.5 text-[10px] opacity-70">
                        1 USD ≈ {getTokenUsdRate(payToken, fx).toPrecision(4)} {tokenCfg.symbol}
                      </span>
                    )}
                  </span>
                  <span className="font-mono text-[11px] text-glow">
                    {formatAmount(arcAtomic, payToken)}
                  </span>
                </div>

                {available && (
                  <Button
                    onClick={handlePayOnArc}
                    variant="outline"
                    className="w-full border-primary/50 bg-primary/10 font-bold text-foreground hover:bg-primary/20"
                    size="lg"
                    disabled={items.length === 0 || arcState.phase === "paying"}
                  >
                    {arcState.phase === "paying" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        {authenticated
                          ? `Pay ${tokenCfg.symbol} on Arc`
                          : "Sign in to pay on Arc"}
                      </>
                    )}
                  </Button>
                )}

                {arcState.phase === "paid" && (
                  <a
                    href={arcState.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-semibold text-foreground underline decoration-glow/60 underline-offset-4"
                  >
                    Settled {arcState.amount} — view receipt on Arcscan
                  </a>
                )}
                {arcState.phase === "error" && (
                  <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-foreground">
                    {arcState.message}
                  </p>
                )}
                {arcState.phase === "idle" && (
                  <p className="text-[11px] leading-snug text-muted-foreground">
                    {settlementNote(payToken)} Demo scale ×{DEMO_SCALE} so testnet balances go far.
                    {fx?.stale ? " FX fallback active." : fx ? ` FX: ${fx.source}.` : ""}
                  </p>
                )}

                <Button
                  onClick={handleCheckout}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/85 font-bold"
                  size="lg"
                  disabled={items.length === 0 || isLoading || isSyncing}
                >
                  {isLoading || isSyncing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Checkout with Shopify
                    </>
                  )}
                </Button>
              </div>

            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
