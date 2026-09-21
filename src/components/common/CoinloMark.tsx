interface CoinloMarkProps {
  /** Width and height in px — the mark is always square. */
  size?: number;
  className?: string;
}

/**
 * Coinlo's brand mark: a coin with a "C" cut into it. Colors are fixed
 * brand colors rather than `currentColor`/MUI's `color="primary"` pattern
 * (unlike the plain MUI icon this replaces) — a two-tone logo mark should
 * read the same way in both light and dark mode, not shift with the app's
 * theme-dependent primary color. `#1e5f8c` is the app's light-mode primary
 * blue (see `theme/theme.ts`), which also gives comfortable contrast for
 * the white "C" against it.
 *
 * The same shape (at the same 0 0 24 24 viewBox) is duplicated as a static
 * file at `public/favicon.svg` for the browser tab icon, and rasterized to
 * PNG/ICO by `scripts/generate-brand-assets.mjs` for favicons that don't
 * support SVG and for the social-preview (OG) image — keep all three in
 * sync if this shape ever changes.
 */
export function CoinloMark({ size = 24, className }: CoinloMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <circle cx="12" cy="12" r="11" fill="#1e5f8c" stroke="#164a6e" strokeWidth="0.75" />
      <circle cx="12" cy="12" r="8.5" fill="none" stroke="#ffffff" strokeOpacity="0.18" strokeWidth="0.75" />
      <path
        d="M 15.4,8 A 5.3,5.3 0 1 0 15.4,16"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
