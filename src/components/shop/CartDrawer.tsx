import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
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
import { ShoppingCart, Minus, Plus, Trash2, ExternalLink, Loader2, Zap, History } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import { usePayToken } from "@/lib/pay-token";
import { useWallet } from "@/lib/wallet-context";
import { settleOnMidnight, settlementNote } from "@/lib/settle";
import { DEMO_SCALE } from "@/lib/agent-card";
import { TOKENS, formatAmount, toAtomic, convertFromFiat, type FxRates } from "@/lib/tokens";
import { useServerFn } from "@tanstack/react-start";
import { fetchFxRates } from "@/lib/fx.functions";
import { LiveTotalCalculator } from "@/components/fx/LiveTotalCalculator";
import { recordSettlement } from "@/lib/tx-log";
import { formatElapsed, useElapsed } from "@/lib/use-elapsed";


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
  const [fx, setFx] = useState<FxRates | null>(null);
  const getFx = useServerFn(fetchFxRates);

  const [arcState, setArcState] = useState<
    | { phase: "idle" }
    | { phase: "paying" }
    | { phase: "paid"; url: string; amount: string; elapsedLabel: string }
    | { phase: "error"; message: string; elapsedLabel: string }
  >({ phase: "idle" });
  const payStartedRef = useRef<number | null>(null);
  const { label: payingLabel } = useElapsed(arcState.phase === "paying");

  // Live FX: convert the listed GBP total into mUSDC atomic units.
  const currencyCode = items[0]?.price.currencyCode ?? "GBP";
  const arcAtomic = toAtomic(
    convertFromFiat(totalPrice * DEMO_SCALE, currencyCode, payToken, fx),
    payToken,
  );

  useEffect(() => {
    if (open) syncCart();
  }, [open, syncCart]);

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
    const embedded = wallets[0] ?? { address: "server-append" };
    payStartedRef.current = Date.now();
    setArcState({ phase: "paying" });
    try {
      const res = await settleOnMidnight(
        embedded,
        payToken,
        "streetrail:treasury:v1",
        arcAtomic,
        "h2h-cart",
      );
      const elapsedLabel = formatElapsed(
        Math.floor((Date.now() - (payStartedRef.current ?? Date.now())) / 1000),
      );
      recordSettlement({
        hash: res.hash,
        mode: "H2H",
        label:
          items.length === 1 && items[0]
            ? `${items[0].product.node.title} ×${items[0].quantity}`
            : `Cart checkout · ${totalItems} item${totalItems === 1 ? "" : "s"}`,
        token: payToken,
        atomic: res.atomic,
        to: res.to,
        from: res.from,
        status: res.simulated ? "pending" : "success",
      });
      setArcState({
        phase: "paid",
        url: res.explorer,
        amount: formatAmount(arcAtomic, payToken),
        elapsedLabel,
      });
    } catch (e) {
      const elapsedLabel = formatElapsed(
        Math.floor((Date.now() - (payStartedRef.current ?? Date.now())) / 1000),
      );
      setArcState({
        phase: "error",
        message: e instanceof Error ? e.message : String(e),
        elapsedLabel,
      });
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
      <SheetContent className="flex h-full w-full flex-col border-border bg-popover text-popover-foreground sm:max-w-lg">
        <SheetHeader className="shrink-0 text-left">
          <SheetTitle className="text-popover-foreground">Your Cart</SheetTitle>
          <SheetDescription className="text-muted-foreground">
            {totalItems === 0
              ? "Your cart is empty"
              : `${totalItems} item${totalItems !== 1 ? "s" : ""} in your cart`}
          </SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col pt-6 text-popover-foreground">
          {items.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Your cart is empty</p>
              </div>
            </div>
          ) : (
            <>
              <div className="min-h-[7.5rem] flex-1 overflow-y-auto pr-2">
                <div className="space-y-3">
                  {items.map((item) => {
                    const img = item.product.node.images?.edges?.[0]?.node;
                    const options = item.selectedOptions.map((o) => o.value).filter(Boolean);
                    return (
                      <div
                        key={item.variantId}
                        className="flex gap-3 rounded-xl border border-border/80 bg-secondary/80 p-3"
                      >
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-background">
                          {img ? (
                            <img
                              src={img.url}
                              alt={item.product.node.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <ShoppingCart className="h-6 w-6 text-muted-foreground" aria-hidden />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="truncate text-sm font-bold tracking-tight text-white">
                            {item.product.node.title}
                          </h4>
                          {options.length > 0 ? (
                            <p className="mt-0.5 text-xs text-white/70">
                              {options.join(" · ")}
                            </p>
                          ) : null}
                          <p className="mt-1 text-sm font-semibold tabular-nums text-glow">
                            {item.price.currencyCode}{" "}
                            {parseFloat(item.price.amount).toFixed(2)}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-white/70 hover:bg-background hover:text-white"
                            onClick={() => removeItem(item.variantId)}
                            aria-label={`Remove ${item.product.node.title}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <div className="flex items-center gap-1 rounded-full border border-border bg-background p-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-white hover:bg-secondary"
                              onClick={() =>
                                updateQuantity(item.variantId, item.quantity - 1)
                              }
                              aria-label="Decrease quantity"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </Button>
                            <span className="w-6 text-center text-sm font-bold tabular-nums text-white">
                              {item.quantity}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-white hover:bg-secondary"
                              onClick={() =>
                                updateQuantity(item.variantId, item.quantity + 1)
                              }
                              aria-label="Increase quantity"
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
              <div className="shrink-0 space-y-2 border-t border-border pt-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-white">Total</span>
                  <span className="text-base font-black tabular-nums text-glow">
                    {items[0]?.price.currencyCode || "£"} {totalPrice.toFixed(2)}
                  </span>
                </div>

                <LiveTotalCalculator
                  fiatAmount={totalPrice}
                  fiatCurrency={items[0]?.price.currencyCode ?? "GBP"}
                  scale={DEMO_SCALE}
                  note={settlementNote(payToken)}
                />

                {available && (
                  <Button
                    onClick={handlePayOnArc}
                    variant="outline"
                    className="w-full border-primary/50 bg-primary/10 font-bold text-foreground hover:bg-primary/20"
                    size="lg"
                    disabled={items.length === 0 || arcState.phase === "paying"}
                  >
                    {arcState.phase === "paying" ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Settling… {payingLabel}
                      </>
                    ) : (
                      <>
                        <Zap className="mr-2 h-4 w-4" />
                        {authenticated
                          ? `Pay ${tokenCfg.symbol} on Midnight`
                          : "Connect to pay on Midnight"}
                      </>
                    )}
                  </Button>
                )}

                {arcState.phase === "paying" && (
                  <p className="text-[11px] leading-snug text-muted-foreground">
                    Proving mUSDC · first proof can take up to ~4 min · elapsed {payingLabel}
                  </p>
                )}

                {arcState.phase === "paid" && (
                  <a
                    href={arcState.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-semibold text-foreground underline decoration-glow/60 underline-offset-4"
                  >
                    Settled {arcState.amount} in {arcState.elapsedLabel} — view receipt on indexer
                  </a>
                )}

                <Link
                  to="/judge"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-glow underline decoration-glow/50 underline-offset-4 transition hover:text-primary"
                >
                  <History className="h-3.5 w-3.5" />
                  Recent settlements
                </Link>
                {arcState.phase === "error" && (
                  <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-foreground">
                    Failed after {arcState.elapsedLabel}: {arcState.message}
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
