/**
 * Thin wrappers around the Google Places JavaScript service.
 *
 * The Places library is loaded by `useJsApiLoader`, so these helpers assume the
 * `google` global exists — every caller guards on `isLoaded` first.
 */

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

function photoUrl(photo: google.maps.places.PlacePhoto | undefined, width = 640): string | null {
  try {
    return photo ? photo.getUrl({ maxWidth: width }) : null;
  } catch {
    return null;
  }
}

export interface NearbySearchParams {
  service: google.maps.places.PlacesService;
  center: { lat: number; lng: number };
  radius: number;
  keyword: string;
  type?: string;
  openNow?: boolean;
  minRating?: number;
}

export function searchNearby({
  service,
  center,
  radius,
  keyword,
  type,
  openNow,
  minRating = 0,
}: NearbySearchParams): Promise<NearbyPlace[]> {
  return new Promise((resolve, reject) => {
    const request: google.maps.places.PlaceSearchRequest = {
      location: new google.maps.LatLng(center.lat, center.lng),
      radius,
      keyword,
      ...(type ? { type } : {}),
      ...(openNow ? { openNow: true } : {}),
    };

    service.nearbySearch(request, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
        resolve([]);
        return;
      }
      if (status !== google.maps.places.PlacesServiceStatus.OK || !results) {
        reject(new Error(`Places search failed (${status}).`));
        return;
      }

      const mapped = results
        .filter((place) => place.place_id && place.geometry?.location)
        .map<NearbyPlace>((place) => {
          const location = {
            lat: place.geometry!.location!.lat(),
            lng: place.geometry!.location!.lng(),
          };
          return {
            placeId: place.place_id as string,
            name: place.name ?? 'Unnamed location',
            address: place.vicinity ?? place.formatted_address ?? '',
            location,
            rating: place.rating ?? null,
            reviewCount: place.user_ratings_total ?? null,
            openNow: place.opening_hours?.isOpen?.() ?? null,
            priceLevel: place.price_level ?? null,
            types: place.types ?? [],
            photoUrl: photoUrl(place.photos?.[0], 400),
            distanceMiles: haversineMiles(center, location),
          };
        })
        .filter((place) => (place.rating ?? 0) >= minRating)
        .sort((a, b) => (a.distanceMiles ?? 0) - (b.distanceMiles ?? 0));

      resolve(mapped);
    });
  });
}

export function getPlaceDetails(
  service: google.maps.places.PlacesService,
  placeId: string,
  origin?: { lat: number; lng: number },
): Promise<PlaceDetails> {
  return new Promise((resolve, reject) => {
    service.getDetails(
      {
        placeId,
        fields: [
          'place_id', 'name', 'formatted_address', 'geometry', 'rating', 'user_ratings_total',
          'formatted_phone_number', 'international_phone_number', 'website', 'opening_hours',
          'photos', 'reviews', 'types', 'url', 'price_level',
        ],
      },
      (place, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !place) {
          reject(new Error(`Could not load place details (${status}).`));
          return;
        }

        const location = place.geometry?.location
          ? { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() }
          : { lat: 0, lng: 0 };

        const weekdayText = place.opening_hours?.weekday_text ?? [];

        resolve({
          placeId: place.place_id as string,
          name: place.name ?? 'Unnamed location',
          address: place.formatted_address ?? '',
          location,
          rating: place.rating ?? null,
          reviewCount: place.user_ratings_total ?? null,
          openNow: place.opening_hours?.isOpen?.() ?? null,
          priceLevel: place.price_level ?? null,
          types: place.types ?? [],
          photoUrl: photoUrl(place.photos?.[0]),
          distanceMiles: origin ? haversineMiles(origin, location) : null,
          phone: place.formatted_phone_number ?? null,
          internationalPhone: place.international_phone_number ?? null,
          website: place.website ?? null,
          openingHours: weekdayText,
          is24Hours: weekdayText.some((line) => /open 24 hours/i.test(line)),
          reviews: (place.reviews ?? []).slice(0, 5).map((review) => ({
            author: review.author_name,
            rating: review.rating ?? 0,
            text: review.text ?? '',
            relativeTime: review.relative_time_description ?? '',
            profilePhoto: review.profile_photo_url ?? null,
          })),
          photos: (place.photos ?? []).slice(0, 6).map((photo) => photoUrl(photo) ?? '').filter(Boolean),
          googleMapsUrl: place.url ?? null,
        });
      },
    );
  });
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
