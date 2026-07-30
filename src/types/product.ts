export const PRODUCT_CATEGORIES = {
  EGGS: "eggs",
  FERTILIZER: "fertilizer",
  CULLED_CHICKEN: "culled_chicken",
  OTHER: "other",
} as const;

export type ProductCategory =
  (typeof PRODUCT_CATEGORIES)[keyof typeof PRODUCT_CATEGORIES];

export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  eggs: "Telur",
  fertilizer: "Pupuk Kandang",
  culled_chicken: "Ayam Afkir",
  other: "Lainnya",
};

export const PRODUCT_UNITS = {
  RACK: "rack",
  PIECE: "piece",
  SACK: "sack",
  HEAD: "head",
} as const;

export type ProductUnit = (typeof PRODUCT_UNITS)[keyof typeof PRODUCT_UNITS];

export const PRODUCT_UNIT_LABELS: Record<ProductUnit, string> = {
  rack: "Rak",
  piece: "Butir",
  sack: "Karung",
  head: "Ekor",
};

export const ALLOWED_UNITS_BY_CATEGORY: Record<
  ProductCategory,
  readonly ProductUnit[]
> = {
  eggs: [PRODUCT_UNITS.RACK, PRODUCT_UNITS.PIECE],
  fertilizer: [PRODUCT_UNITS.SACK],
  culled_chicken: [PRODUCT_UNITS.HEAD],
  other: [
    PRODUCT_UNITS.RACK,
    PRODUCT_UNITS.PIECE,
    PRODUCT_UNITS.SACK,
    PRODUCT_UNITS.HEAD,
  ],
};
