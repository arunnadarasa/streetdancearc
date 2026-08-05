import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Loader2, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { useCartStore } from "@/stores/cartStore";
import type { ShopifyProduct } from "@/lib/shopify";
import { usePayToken } from "@/lib/pay-token";

export function ProductCard({ product }: { product: ShopifyProduct }) {
  const [payToken] = usePayToken();
  const addItem = useCartStore((s) => s.addItem);
  const isLoading = useCartStore((s) => s.isLoading);
  const variant = product.node.variants.edges[0]?.node;
  const img = product.node.images.edges[0]?.node;
  const price = product.node.priceRange.minVariantPrice;

  const handleAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!variant) return;
    await addItem({
      product,
      variantId: variant.id,
      variantTitle: variant.title,
      price: variant.price,
      quantity: 1,
      selectedOptions: variant.selectedOptions || [],
    });
    toast.success(`${product.node.title} added to cart`, { position: "top-center" });
  };

  return (
    <Link
      to="/product/$handle"
      params={{ handle: product.node.handle }}
      className="lift group flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-card/70"
    >
      <div className="relative aspect-square overflow-hidden bg-muted/40">
        {img ? (
          <img
            src={img.url}
            alt={img.altText || product.node.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110"
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-linear-to-br from-indigo-950 via-slate-900 to-indigo-900">
            <div className="flex flex-col items-center gap-3 text-indigo-200/60">
              <ShoppingBag className="h-10 w-10" />
              <span className="max-w-[80%] text-center text-[10px] font-bold uppercase tracking-widest">
                {product.node.title}
              </span>
            </div>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-background via-background/10 to-transparent opacity-90" />
        <span className="absolute left-3 top-3 rounded-full border border-border bg-background/70 px-2.5 py-1 text-[10px] font-bold tracking-widest text-glow backdrop-blur">
          {payToken}
        </span>
        <span className="display absolute bottom-3 left-3 text-lg text-foreground drop-shadow-lg">
          {price.currencyCode} {parseFloat(price.amount).toFixed(2)}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="truncate text-sm font-semibold text-foreground sm:text-base">
          {product.node.title}
        </h3>
        <Button
          size="sm"
          onClick={handleAdd}
          disabled={isLoading || !variant}
          className="mt-auto h-9 w-full rounded-full bg-secondary text-xs font-bold text-foreground transition group-hover:bg-linear-to-r group-hover:from-primary group-hover:to-glow group-hover:text-primary-foreground"
        >
          {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add to cart"}
        </Button>
      </div>
    </Link>
  );
}

