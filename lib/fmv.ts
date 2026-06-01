const FMV_RANGES: Record<string, { min: number; max: number }> = {
  'Furniture': { min: 75, max: 300 },
  'Bedding & Linens': { min: 10, max: 30 },
  'Kitchen & Dining': { min: 15, max: 50 },
  'Pantry & Food': { min: 5, max: 20 },
  'Hygiene & Personal Care': { min: 5, max: 20 },
  'Cleaning Supplies': { min: 5, max: 20 },
  'Baby & Children': { min: 10, max: 40 },
  'Clothing & Shoes': { min: 5, max: 25 },
  'Electronics & Lighting': { min: 10, max: 50 },
  'Office & School Supplies': { min: 10, max: 30 },
  'Miscellaneous': { min: 5, max: 20 },
};

export function estimateFMV(category: string, condition: string): number {
  const range = FMV_RANGES[category] ?? { min: 5, max: 20 };
  const midpoint = (range.min + range.max) / 2;
  const multiplier = condition === 'New' ? 1.0 : condition === 'Used - Good' ? 0.7 : 0.4;
  return Math.round(midpoint * multiplier * 100) / 100;
}
