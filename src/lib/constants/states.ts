// ─── Indian States & Union Territories Master Constants ───
// All 28 States and 8 Union Territories of India (36 jurisdictions total)

export const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
] as const;

export const UNION_TERRITORIES = [
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
] as const;

export const ALL_INDIAN_REGIONS = [
  ...INDIAN_STATES,
  ...UNION_TERRITORIES,
].sort((a, b) => a.localeCompare(b));

export type IndianState = typeof INDIAN_STATES[number];
export type UnionTerritory = typeof UNION_TERRITORIES[number];
export type IndianRegion = typeof ALL_INDIAN_REGIONS[number];
