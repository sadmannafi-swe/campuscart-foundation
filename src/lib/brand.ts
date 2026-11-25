/**
 * Brand and campus logos are static files in /public/brand.
 * Missing files fall back to a text badge (see BrandImage).
 */
export const brandAssets = {
  logo: "/brand/campuscart-logo.png",
  /** Same logo with cream lettering, for dark mode. */
  logoDark: "/brand/campuscart-logo-dark.png",
  mainLogo: "/brand/campuscart-main-logo.png",
  diu: "/brand/diu.png",
  nsu: "/brand/nsu.png",
  brac: "/brand/brac.png",
  du: "/brand/du.jpg",
  ewu: "/brand/ewu.jpg",
} as const;
