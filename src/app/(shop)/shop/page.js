import { Suspense } from "react";
import ShopClient from "@/components/ShopClient";
import { PAGE_SIZE, toApiParams, queryKey } from "@/lib/shopQuery";
import {
  fetchCategories,
  fetchSubcategories,
  fetchProducts,
} from "@/lib/catalog";

export const metadata = {
  title: "Shop all products — OROS",
  description:
    "Browse 3D printed figurines, lighting, desk storage, decor and seasonal pieces. Filter by category, material, colour and price.",
};

/**
 * The first page of products is fetched here on the server, so the grid —
 * and its images — arrive with the HTML instead of waiting for the client
 * bundle to boot and call the API. ShopClient takes over from there.
 */
export default async function ShopPage({ searchParams }) {
  const sp = await searchParams;
  const one = (v) => (Array.isArray(v) ? v[0] : v) || "";
  const q = one(sp.q);
  const categorySlug = one(sp.category);
  const subcategorySlug = one(sp.subcategory);
  const page = Math.max(1, Number(one(sp.page)) || 1);
  const sort = one(sp.sort) || "price-asc";

  const categories = await fetchCategories();
  const category = categories.find((c) => c.slug === categorySlug) || null;
  const subcategories = category ? await fetchSubcategories(category.id) : [];
  const subcategory =
    subcategories.find((s) => s.slug === subcategorySlug) || null;

  // no price filter on first load — the slider starts at full range
  const apiParams = toApiParams({
    sort,
    categoryId: category?.id,
    subcategoryId: subcategory?.id,
    q,
  });
  const { products, pagination } = await fetchProducts({
    ...apiParams,
    page,
    limit: PAGE_SIZE,
  });

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[1440px] px-4 py-20 text-sm text-ink-3 lg:px-6">
          Loading products…
        </div>
      }
    >
      <ShopClient
        initial={{
          key: queryKey(apiParams, page),
          products,
          pagination,
          categories,
          subcategories,
        }}
      />
    </Suspense>
  );
}
