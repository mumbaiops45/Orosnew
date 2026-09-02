import { notFound } from "next/navigation";
import ProductDetail from "@/components/ProductDetail";
import Rail from "@/components/Rail";
import { PRODUCTS, getProduct, relatedTo } from "@/lib/products";

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const p = getProduct(slug);
  if (!p) return { title: "Product not found — OROS" };
  return {
    title: `${p.name} — OROS`,
    description: p.blurb,
  };
}

export default async function ProductPage({ params }) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();

  const related = relatedTo(product, 5);

  return (
    <div className="space-y-3 pb-3">
      <ProductDetail product={product} />
      {related.length > 0 && (
        <Rail
          title="Similar products"
          subtitle={`More from ${product.category}`}
          products={related}
          href={`/shop?category=${product.category}`}
        />
      )}
    </div>
  );
}
