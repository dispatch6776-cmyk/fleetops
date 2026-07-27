import type { LucideIcon } from 'lucide-react';
import { Fuel, LifeBuoy, Truck, Wrench } from 'lucide-react';

/** A single Overpass tag filter, e.g. { key: 'shop', value: 'car_repair' }. */
export interface OverpassFilter {
  key: string;
  value?: string;
}

export interface ShopCategory {
  id: string;
  label: string;
  icon: LucideIcon;
  /** OpenStreetMap tag filters queried (OR'd together) for this category. */
  filters: OverpassFilter[];
  /** Optional case-insensitive regex on the name tag, layered on top of the filters. */
  nameRegex?: string;
  color: string;
}

/**
 * The categories an owner-operator actually needs on the road. Backed by free
 * OpenStreetMap data via the Overpass API — no API key or billing required.
 * Coverage varies by area since it's community-mapped, unlike a paid provider.
 */
export const SHOP_CATEGORIES: ShopCategory[] = [
  {
    id: 'repair',
    label: 'Truck repair',
    icon: Wrench,
    filters: [
      { key: 'shop', value: 'car_repair' },
      { key: 'shop', value: 'truck' },
      { key: 'craft', value: 'truck_repair' },
    ],
    nameRegex: 'truck|diesel|heavy duty',
    color: 'hsl(var(--primary))',
  },
  {
    id: 'truck_stop',
    label: 'Truck stops',
    icon: Fuel,
    filters: [{ key: 'amenity', value: 'fuel' }],
    nameRegex: "truck|travel center|petro|pilot|flying j|love's|\\bta\\b",
    color: 'hsl(var(--success))',
  },
  {
    id: 'towing',
    label: 'Towing & recovery',
    icon: LifeBuoy,
    filters: [{ key: 'shop', value: 'car_repair' }],
    nameRegex: 'tow|recovery|wrecker',
    color: 'hsl(var(--danger))',
  },
  {
    id: 'dealer',
    label: 'Dealers',
    icon: Truck,
    filters: [
      { key: 'shop', value: 'truck' },
      { key: 'shop', value: 'car' },
    ],
    nameRegex: 'truck|volvo|freightliner|kenworth|peterbilt|international|mack',
    color: 'hsl(var(--info))',
  },
];

/** Brand/chain filters layered on top of the category search as a name regex. */
export const BRAND_FILTERS: { id: string; label: string; nameRegex: string; group: string }[] = [
  { id: 'ta', label: 'TA / Petro', nameRegex: '\\bta\\b|petro', group: 'Truck stops' },
  { id: 'loves', label: "Love's", nameRegex: "love's", group: 'Truck stops' },
  { id: 'pilot', label: 'Pilot Flying J', nameRegex: 'pilot|flying j', group: 'Truck stops' },
  { id: 'volvo', label: 'Volvo', nameRegex: 'volvo', group: 'Dealers' },
  { id: 'freightliner', label: 'Freightliner', nameRegex: 'freightliner', group: 'Dealers' },
  { id: 'kenworth', label: 'Kenworth', nameRegex: 'kenworth', group: 'Dealers' },
  { id: 'peterbilt', label: 'Peterbilt', nameRegex: 'peterbilt', group: 'Dealers' },
  { id: 'international', label: 'International', nameRegex: 'international', group: 'Dealers' },
  { id: 'cummins', label: 'Cummins', nameRegex: 'cummins', group: 'Engines' },
  { id: 'detroit', label: 'Detroit Diesel', nameRegex: 'detroit diesel', group: 'Engines' },
  { id: 'cat', label: 'CAT', nameRegex: 'caterpillar|\\bcat\\b', group: 'Engines' },
];

export const DISTANCE_OPTIONS = [
  { value: '8047', label: 'Within 5 miles' },
  { value: '16093', label: 'Within 10 miles' },
  { value: '40234', label: 'Within 25 miles' },
  { value: '80467', label: 'Within 50 miles' },
];

/** Fallback centre — the geographic middle of the lower 48. */
export const DEFAULT_CENTER = { lat: 39.8283, lng: -98.5795 };

/**
 * Free basemap tile layer — no key required. Attribution is mandatory.
 * Uses the standard OpenStreetMap tile server, the most reliable free/keyless
 * option (CARTO's anonymous basemap CDN has been returning 503s).
 * Dark mode is achieved with a CSS filter on the tile layer instead of a
 * separate (keyed) dark tile set.
 */
export const TILE_LAYERS = {
  light: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  dark: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
} as const;
