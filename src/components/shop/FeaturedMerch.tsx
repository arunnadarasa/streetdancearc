import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { STOREFRONT_QUERY, storefrontApiRequest, type ShopifyProduct } from "@/lib/shopify";
import { ProductCard } from "@/components/shop/ProductCard";
import { Reveal } from "@/components/layout/Reveal";

export function FeaturedMerch({ count = 4 }: { count?: number }) {
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await storefrontApiRequest(STOREFRONT_QUERY, { first: count });
        setProducts(data?.data?.products?.edges ?? []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [count]);

  if (loading) {
    return (
      <div className="grid place-items-center py-16">
        <Loader2 className="h-7 w-7 animate-spin text-glow" />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <p className="py-10 text-sm text-muted-foreground">
        No products found — add a piece to the drop to see it here.
      </p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3.5 sm:gap-5 lg:grid-cols-4">
        {products.map((p, i) => (
          <Reveal key={p.node.id} delay={i * 80}>
            <ProductCard product={p} />
          </Reveal>
        ))}
      </div>
      <div className="mt-8 flex justify-center">
        <Link
          to="/shop"
          className="lift rounded-full border border-border bg-surface/60 px-7 py-3.5 text-sm font-bold text-foreground backdrop-blur"
        >
          See the full rack →
        </Link>
      </div>
    </>
  );
}
