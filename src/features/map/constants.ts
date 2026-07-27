import type { LucideIcon } from 'lucide-react';
import { Fuel, LifeBuoy, Truck, Wrench } from 'lucide-react';

export interface ShopCategory {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Google Places text query used for the nearby search. */
  keyword: string;
  type?: string;
  color: string;
}

/**
 * The categories an owner-operator actually needs on the road. Brand keywords
 * are passed straight to the Places API so results stay current without us
 * maintaining a directory.
 */
export const SHOP_CATEGORIES: ShopCategory[] = [
  {
    id: 'repair',
    label: 'Truck repair',
    icon: Wrench,
    keyword: 'heavy duty truck repair',
    type: 'car_repair',
    color: 'hsl(var(--primary))',
  },
  {
    id: 'truck_stop',
    label: 'Truck stops',
    icon: Fuel,
    keyword: 'truck stop',
    type: 'gas_station',
    color: 'hsl(var(--success))',
  },
  {
    id: 'towing',
    label: 'Towing & recovery',
    icon: LifeBuoy,
    keyword: 'heavy duty towing',
    color: 'hsl(var(--danger))',
  },
  {
    id: 'dealer',
    label: 'Dealers',
    icon: Truck,
    keyword: 'truck dealership service center',
    color: 'hsl(var(--info))',
  },
];

/** Chain and OEM filters layered on top of the category search. */
export const BRAND_FILTERS: { id: string; label: string; keyword: string; group: string }[] = [
  { id: 'ta', label: 'TA / Petro', keyword: 'TA Travel Center Petro', group: 'Truck stops' },
  { id: 'loves', label: "Love's", keyword: "Love's Travel Stop", group: 'Truck stops' },
  { id: 'pilot', label: 'Pilot Flying J', keyword: 'Pilot Flying J', group: 'Truck stops' },
  { id: 'volvo', label: 'Volvo', keyword: 'Volvo Trucks dealer service', group: 'Dealers' },
  { id: 'freightliner', label: 'Freightliner', keyword: 'Freightliner dealer service', group: 'Dealers' },
  { id: 'kenworth', label: 'Kenworth', keyword: 'Kenworth dealer service', group: 'Dealers' },
  { id: 'peterbilt', label: 'Peterbilt', keyword: 'Peterbilt dealer service', group: 'Dealers' },
  { id: 'international', label: 'International', keyword: 'International Truck dealer service', group: 'Dealers' },
  { id: 'cummins', label: 'Cummins', keyword: 'Cummins service center', group: 'Engines' },
  { id: 'detroit', label: 'Detroit Diesel', keyword: 'Detroit Diesel service center', group: 'Engines' },
  { id: 'cat', label: 'CAT', keyword: 'Caterpillar truck engine service', group: 'Engines' },
];

export const DISTANCE_OPTIONS = [
  { value: '8047', label: 'Within 5 miles' },
  { value: '16093', label: 'Within 10 miles' },
  { value: '40234', label: 'Within 25 miles' },
  { value: '80467', label: 'Within 50 miles' },
];

/** Fallback centre — the geographic middle of the lower 48. */
export const DEFAULT_CENTER = { lat: 39.8283, lng: -98.5795 };

export const MAP_STYLES_DARK: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#334155' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#cbd5e1' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0b1220' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];
