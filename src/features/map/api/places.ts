/**
 * Free, keyless map data sources.
 *
 * - Overpass API (https://overpass-api.de) for nearby shops/stops — an open
 *   mirror of OpenStreetMap data. No API key, no billing.
 * - Nominatim (https://nominatim.openstreetmap.org) for turning a typed
 *   address/city/zip into coordinates (the "search box").
 *
 * Trade-off vs. a paid provider: no star ratings, reviews or photos — OSM
 * doesn't carry that data. Everything else (name, address, phone, website,
 * hours, distance, directions) still works.
 */
import type { OverpassFilter, ShopCategory } from '../constants';

export interface NearbyPlace {
  placeId: string;
  name: string;
  address: string;
  location: { lat: number; lng: number };
  rating: number | null;
  reviewCount: number | null;
  openNow: boolean | null;
  priceLevel: number | null;
  types: string[];
  photoUrl: string | null;
  /** Straight-line distance in miles from the search origin. */
  distanceMiles: number | null;
}

export interface PlaceDetails extends NearbyPlace {
  phone: string | null;
  internationalPhone: string | null;
  website: string | null;
  openingHours: string[];
  is24Hours: boolean;
  reviews: {
    author: string;
    rating: number;
    text: string;
    relativeTime: string;
    profilePhoto: string | null;
  }[];
  photos: string[];
  googleMapsUrl: string | null;
}

const EARTH_RADIUS_MILES = 3958.8;

export function haversineMiles(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(h));
}

const OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter';
const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org';

interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

/** In-memory cache of the raw elements from the last search, keyed by placeId. */
const elementCache = new Map<string, OverpassElement>();

function buildOverpassQuery(
  filters: OverpassFilter[],
  center: { lat: number; lng: number },
  radiusMeters: number,
  nameRegex?: string,
): string {
  const around = `(around:${Math.round(radiusMeters)},${center.lat},${center.lng})`;
  const clauses = filters
    .map((filter) => {
      const tagClause = filter.value ? `["${filter.key}"="${filter.value}"]` : `["${filter.key}"]`;
      return [
        `  node${tagClause}${around};`,
        `  way${tagClause}${around};`,
      ].join('\n');
    })
    .join('\n');

  // Also try a pure name-match search (any shop/amenity whose name matches),
  // so brand searches like "Love's" surface results even if the tag scheme
  // used by that particular mapper differs from our filter list.
  const nameOnlyClause = nameRegex
    ? [
        `  node["name"~"${nameRegex}",i]${around};`,
        `  way["name"~"${nameRegex}",i]${around};`,
      ].join('\n')
    : '';

  return `
[out:json][timeout:25];
(
${clauses}
${nameOnlyClause}
);
out center tags;
`.trim();
}

async function runOverpassQuery(query: string): Promise<OverpassElement[]> {
  const response = await fetch(OVERPASS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!response.ok) {
    throw new Error(`OpenStreetMap search failed (${response.status}). Try again in a moment.`);
  }
  const data = (await response.json()) as { elements: OverpassElement[] };
  return data.elements ?? [];
}

function elementLocation(element: OverpassElement): { lat: number; lng: number } | null {
  if (typeof element.lat === 'number' && typeof element.lon === 'number') {
    return { lat: element.lat, lng: element.lon };
  }
  if (element.center) {
    return { lat: element.center.lat, lng: element.center.lon };
  }
  return null;
}

function formatAddress(tags: Record<string, string>): string {
  const parts = [
    [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' '),
    tags['addr:city'],
    [tags['addr:state'], tags['addr:postcode']].filter(Boolean).join(' '),
  ].filter((part) => part && part.trim().length > 0);
  return parts.join(', ');
}

function toNearbyPlace(
  element: OverpassElement,
  center: { lat: number; lng: number },
): NearbyPlace | null {
  const location = elementLocation(element);
  const tags = element.tags ?? {};
  if (!location || !tags.name) return null;

  const placeId = `${element.type}/${element.id}`;
  elementCache.set(placeId, element);

  return {
    placeId,
    name: tags.name,
    address: formatAddress(tags) || tags['addr:full'] || '',
    location,
    rating: null,
    reviewCount: null,
    openNow: null,
    priceLevel: null,
    types: [tags.shop, tags.amenity, tags.craft].filter((value): value is string => Boolean(value)),
    photoUrl: null,
    distanceMiles: haversineMiles(center, location),
  };
}

export interface NearbySearchParams {
  center: { lat: number; lng: number };
  radius: number;
  category: ShopCategory;
  /** When set (a brand filter is active), search by name instead of the category's tags. */
  nameRegexOverride?: string;
}

export async function searchNearby({
  center,
  radius,
  category,
  nameRegexOverride,
}: NearbySearchParams): Promise<NearbyPlace[]> {
  const nameRegex = nameRegexOverride ?? category.nameRegex;
  const query = buildOverpassQuery(category.filters, center, radius, nameRegex);
  const elements = await runOverpassQuery(query);

  const seen = new Set<string>();
  const places: NearbyPlace[] = [];
  for (const element of elements) {
    const place = toNearbyPlace(element, center);
    if (!place) continue;
    const dedupeKey = `${place.name.toLowerCase()}|${place.location.lat.toFixed(3)}|${place.location.lng.toFixed(3)}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    places.push(place);
  }

  return places.sort((a, b) => (a.distanceMiles ?? 0) - (b.distanceMiles ?? 0));
}

export async function getPlaceDetails(
  placeId: string,
  origin?: { lat: number; lng: number },
): Promise<PlaceDetails> {
  const element = elementCache.get(placeId);
  if (!element) {
    throw new Error('This shop is no longer in the current search results — try searching again.');
  }

  const tags = element.tags ?? {};
  const location = elementLocation(element) ?? { lat: 0, lng: 0 };
  const openingHoursRaw = tags.opening_hours ?? '';
  const is24Hours = /24\/7/i.test(openingHoursRaw);

  return {
    placeId,
    name: tags.name ?? 'Unnamed location',
    address: formatAddress(tags) || tags['addr:full'] || '',
    location,
    rating: null,
    reviewCount: null,
    openNow: null,
    priceLevel: null,
    types: [tags.shop, tags.amenity, tags.craft].filter((value): value is string => Boolean(value)),
    photoUrl: null,
    distanceMiles: origin ? haversineMiles(origin, location) : null,
    phone: tags.phone ?? tags['contact:phone'] ?? null,
    internationalPhone: tags.phone ?? tags['contact:phone'] ?? null,
    website: tags.website ?? tags['contact:website'] ?? null,
    openingHours: openingHoursRaw ? [openingHoursRaw] : [],
    is24Hours,
    reviews: [],
    photos: [],
    googleMapsUrl: null,
  };
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  label: string;
}

/** Turn a typed address/city/zip into coordinates using free Nominatim geocoding. */
export async function geocodeSearch(query: string): Promise<GeocodeResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const params = new URLSearchParams({
    format: 'jsonv2',
    q: trimmed,
    countrycodes: 'us',
    limit: '5',
  });

  const response = await fetch(`${NOMINATIM_ENDPOINT}/search?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error('Location search failed. Try again in a moment.');
  }
  const results = (await response.json()) as { lat: string; lon: string; display_name: string }[];
  return results.map((result) => ({
    lat: Number(result.lat),
    lng: Number(result.lon),
    label: result.display_name,
  }));
}

/** Turn-by-turn navigation link that works on desktop and both mobile platforms. */
export function directionsUrl(
  destination: { lat: number; lng: number } | string,
  origin?: { lat: number; lng: number },
): string {
  const target =
    typeof destination === 'string' ? destination : `${destination.lat},${destination.lng}`;
  const params = new URLSearchParams({
    api: '1',
    destination: target,
    travelmode: 'driving',
  });
  if (origin) params.set('origin', `${origin.lat},${origin.lng}`);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
