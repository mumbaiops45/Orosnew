/**
 * Catalogue data access. Everything the storefront shows about products
 * and categories comes through here — always from the live API, always
 * normalised. Used by both server components and client components.
 */

import * as productApi from "@/api/product.api";
import * as categoryApi from "@/api/category.api";
import * as subcategoryApi from "@/api/subcategory.api";
import * as couponApi from "@/api/coupon.api";
import {
  normalizeProduct,
  normalizeProductList,
  normalizeCategoryList,
  normalizeSubcategoryList,
} from "@/lib/normalize";

const IS_OBJECT_ID = /^[a-f\d]{24}$/i;

const swallow = (fallback) => (err) => {
  if (process.env.NODE_ENV !== "production") {
    console.warn("[catalog]", err?.message || err);
  }
  return fallback;
};

export async function fetchProducts(params = {}) {
  const query = { limit: 60, status: "PUBLISHED", ...params };
  const data = await productApi
    .listProducts(query)
    .catch(swallow({ products: [], pagination: { total: 0 } }));
  return {
    products: normalizeProductList(data.products),
    pagination: data.pagination || { total: data.products?.length || 0 },
  };
}

export async function fetchBestSellers(limit = 10) {
  const data = await productApi
    .listBestSellers({ limit })
    .catch(swallow({ products: [] }));
  return normalizeProductList(data.products);
}

export async function fetchSuggested(id, limit = 8) {
  if (!id) return [];
  const data = await productApi
    .listSuggestedProducts(id, { limit })
    .catch(swallow({ products: [] }));
  return normalizeProductList(data.products);
}

/** Full PDP payload by slug (or id). Returns null when nothing matches. */
export async function fetchProductBySlug(slugOrId) {
  if (!slugOrId) return null;

  let id = IS_OBJECT_ID.test(slugOrId) ? slugOrId : null;

  if (!id) {
    const list = await productApi
      .listProducts({ limit: 200, status: "PUBLISHED" })
      .catch(swallow({ products: [] }));
    const hit = (list.products || []).find((p) => p.slug === slugOrId);
    if (!hit) return null;
    id = hit._id;
  }

  const data = await productApi.getProduct(id).catch(swallow(null));
  if (!data) return null;
  return normalizeProduct(data);
}

export async function fetchCategories() {
  const data = await categoryApi
    .listCategories({ limit: 100 })
    .catch(swallow({ category: [] }));
  return normalizeCategoryList(data.category);
}

export async function fetchSubcategories(categoryId) {
  const params = { limit: 200 };
  if (categoryId) params.category = categoryId;
  const data = await subcategoryApi
    .listSubcategories(params)
    .catch(swallow({ subCategory: [] }));
  return normalizeSubcategoryList(data.subCategory);
}

export async function fetchCoupons() {
  const data = await couponApi
    .listCoupons({ limit: 50 })
    .catch(swallow({ coupons: [] }));
  const now = Date.now();
  return (data.coupons || []).filter(
    (c) =>
      c.isActive !== false &&
      (!c.endDate || new Date(c.endDate).getTime() >= now)
  );
}
