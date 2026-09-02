import Image from "next/image";

/**
 * Product photography, in two modes:
 *
 *   box     (default) — the wrapper is `relative` and you size it yourself
 *                       via className, e.g. "h-11 w-11" or "h-full w-full".
 *   overlay (fill)    — the wrapper is `absolute inset-0` and covers its
 *                       nearest positioned ancestor.
 *
 * The mode has to be explicit: `next/image` with `fill` needs a positioned,
 * non-zero-height wrapper, and passing both `relative` and `absolute` in one
 * class list silently collapses it to 0px (Tailwind orders `.relative` after
 * `.absolute`, so `relative` wins and the absolute child stops contributing
 * any height).
 */
export default function ProductImage({
  src,
  alt,
  sizes = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw",
  className = "",
  imgClassName = "",
  fit = "cover",
  priority = false,
  overlay = false,
}) {
  return (
    <div
      className={`overflow-hidden ${overlay ? "absolute inset-0" : "relative"} ${className}`}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className={`${fit === "contain" ? "object-contain" : "object-cover"} ${imgClassName}`}
      />
    </div>
  );
}
