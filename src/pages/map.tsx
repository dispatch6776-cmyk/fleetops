import { useCallback, useMemo, useState } from 'react';
import { GoogleMap, InfoWindow, Marker, useJsApiLoader } from '@react-google-maps/api';
import {
  Crosshair,
  ExternalLink,
  MapPin,
  Navigation,
  RefreshCw,
  Star,
  Truck as TruckIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { NativeSelect } from '@/components/ui/native-select';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/empty-state';
import { ErrorState } from '@/components/common/error-state';
import { PageHeader } from '@/components/common/page-header';
import { ShopDetailDialog } from '@/features/map/components/shop-detail-dialog';
import {
  BRAND_FILTERS,
  DEFAULT_CENTER,
  DISTANCE_OPTIONS,
  MAP_STYLES_DARK,
  SHOP_CATEGORIES,
} from '@/features/map/constants';
import { directionsUrl } from '@/features/map/api/places';
import { useBrowserLocation, useNearbyPlaces, usePlaceDetails } from '@/features/map/hooks';
import { useActiveTruck, useLatestLocation } from '@/features/trucks/hooks';
import { useTheme } from '@/hooks/use-theme';
import { env, isMapsConfigured } from '@/lib/env';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';

const LIBRARIES: 'places'[] = ['places'];

export default function MapPage() {
  const { truck, truckId } = useActiveTruck();
  const truckLocation = useLatestLocation(truckId);
  const { resolved } = useTheme();

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: env.googleMapsApiKey,
    libraries: LIBRARIES,
    id: 'fleetops-google-maps',
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [categoryId, setCategoryId] = useState(SHOP_CATEGORIES[0].id);
  const [brandId, setBrandId] = useState('all');
  const [radius, setRadius] = useState('40234');
  const [openNow, setOpenNow] = useState(false);
  const [minRating, setMinRating] = useState('0');
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [hoveredPlaceId, setHoveredPlaceId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const truckPosition = useMemo(
    () =>
      truckLocation.data
        ? { lat: Number(truckLocation.data.latitude), lng: Number(truckLocation.data.longitude) }
        : null,
    [truckLocation.data],
  );

  const { center, position: browserPosition, denied, request } = useBrowserLocation(truckPosition);
  const searchCenter = center ?? DEFAULT_CENTER;

  const category = SHOP_CATEGORIES.find((item) => item.id === categoryId) ?? SHOP_CATEGORIES[0];
  const brand = BRAND_FILTERS.find((item) => item.id === brandId);
  const keyword = brand ? brand.keyword : category.keyword;

  const { places, loading, error, refresh, service } = useNearbyPlaces(map, {
    center: searchCenter,
    radius: Number(radius),
    keyword,
    type: brand ? undefined : category.type,
    openNow,
    minRating: Number(minRating),
    enabled: isLoaded && isMapsConfigured,
  });

  const { details, loading: detailsLoading, error: detailsError } = usePlaceDetails(
    service.current,
    selectedPlaceId,
    searchCenter,
  );

  const onLoad = useCallback((instance: google.maps.Map) => setMap(instance), []);
  const onUnmount = useCallback(() => setMap(null), []);

  if (!isMapsConfigured) {
    return (
      <div className="space-y-6">
        <PageHeader title="Map & service shops" description="Find repair shops, truck stops and towing near the truck." />
        <EmptyState
          icon={MapPin}
          title="Google Maps is not configured"
          description="Add VITE_GOOGLE_MAPS_API_KEY to your environment and reload. Enable the Maps JavaScript API and Places API in Google Cloud, then restrict the key by HTTP referrer."
        />
      </div>
    );
  }

  if (loadError) {
    return (
      <ErrorState
        title="Google Maps failed to load"
        description="Check that the API key is valid, billing is enabled and this domain is allowed as a referrer."
      />
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Map & service shops"
        description={
          truck
            ? `Repair shops, truck stops, dealers and towing near ${truck.truck_number}.`
            : 'Repair shops, truck stops, dealers and towing.'
        }
        actions={
          <>
            <Button variant="outline" onClick={request}>
              <Crosshair />
              Use my location
            </Button>
            <Button variant="outline" onClick={() => void refresh()} loading={loading}>
              <RefreshCw />
              Refresh
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          {SHOP_CATEGORIES.map((item) => (
            <Button
              key={item.id}
              variant={item.id === categoryId && brandId === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setCategoryId(item.id);
                setBrandId('all');
              }}
            >
              <item.icon />
              {item.label}
            </Button>
          ))}
        </div>

        <NativeSelect
          className="w-40"
          aria-label="Brand"
          value={brandId}
          onChange={(event) => setBrandId(event.target.value)}
          options={[
            { value: 'all', label: 'All brands' },
            ...BRAND_FILTERS.map((item) => ({ value: item.id, label: item.label })),
          ]}
        />
        <NativeSelect
          className="w-40"
          aria-label="Distance"
          value={radius}
          onChange={(event) => setRadius(event.target.value)}
          options={DISTANCE_OPTIONS}
        />
        <NativeSelect
          className="w-36"
          aria-label="Minimum rating"
          value={minRating}
          onChange={(event) => setMinRating(event.target.value)}
          options={[
            { value: '0', label: 'Any rating' },
            { value: '3', label: '3.0+' },
            { value: '4', label: '4.0+' },
            { value: '4.5', label: '4.5+' },
          ]}
        />
        <Button
          variant={openNow ? 'default' : 'outline'}
          size="sm"
          onClick={() => setOpenNow((value) => !value)}
        >
          Open now
        </Button>
      </div>

      {denied && !browserPosition ? (
        <p className="rounded-lg border border-border bg-surface-muted/50 px-3 py-2 text-xs text-muted-foreground">
          Location access was declined — searching around the truck&apos;s last reported position instead.
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <Card className="overflow-hidden p-0">
          {!isLoaded ? (
            <Skeleton className="h-[32rem] w-full rounded-none" />
          ) : (
            <GoogleMap
              mapContainerStyle={{ width: '100%', height: '32rem' }}
              center={searchCenter}
              zoom={10}
              onLoad={onLoad}
              onUnmount={onUnmount}
              options={{
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: true,
                clickableIcons: false,
                styles: resolved === 'dark' ? MAP_STYLES_DARK : undefined,
              }}
            >
              {truckPosition ? (
                <Marker
                  position={truckPosition}
                  title={truck ? `${truck.truck_number} — last known position` : 'Truck'}
                  icon={{
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 9,
                    fillColor: '#2563eb',
                    fillOpacity: 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 3,
                  }}
                />
              ) : null}

              {places.map((place) => (
                <Marker
                  key={place.placeId}
                  position={place.location}
                  title={place.name}
                  onClick={() => {
                    setSelectedPlaceId(place.placeId);
                    setDetailOpen(true);
                  }}
                  onMouseOver={() => setHoveredPlaceId(place.placeId)}
                  onMouseOut={() => setHoveredPlaceId(null)}
                />
              ))}

              {hoveredPlaceId
                ? (() => {
                    const place = places.find((item) => item.placeId === hoveredPlaceId);
                    if (!place) return null;
                    return (
                      <InfoWindow
                        position={place.location}
                        options={{ disableAutoPan: true }}
                        onCloseClick={() => setHoveredPlaceId(null)}
                      >
                        <div style={{ color: '#0f172a', maxWidth: 200 }}>
                          <strong style={{ display: 'block', fontSize: 13 }}>{place.name}</strong>
                          <span style={{ fontSize: 12 }}>
                            {place.rating ? `${place.rating.toFixed(1)} ★ · ` : ''}
                            {place.distanceMiles?.toFixed(1)} mi
                          </span>
                        </div>
                      </InfoWindow>
                    );
                  })()
                : null}
            </GoogleMap>
          )}
        </Card>

        <div className="flex max-h-[32rem] flex-col gap-2 overflow-y-auto pr-1">
          {truckLocation.data ? (
            <Card className="p-3">
              <div className="flex items-start gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary/12 text-primary">
                  <TruckIcon className="size-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium">Last known position</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {truckLocation.data.address ??
                      `${truckLocation.data.latitude}, ${truckLocation.data.longitude}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(truckLocation.data.recorded_at)}
                  </p>
                </div>
              </div>
            </Card>
          ) : null}

          {error ? <ErrorState title="Search failed" description={error} onRetry={() => void refresh()} /> : null}

          {loading ? (
            Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-24 w-full" />)
          ) : places.length === 0 && !error ? (
            <EmptyState
              compact
              icon={MapPin}
              title="Nothing found nearby"
              description="Try a wider radius, a different category or turn off the “open now” filter."
            />
          ) : (
            places.map((place) => (
              <Card
                key={place.placeId}
                className={cn(
                  'cursor-pointer p-3 transition-shadow hover:shadow-card',
                  hoveredPlaceId === place.placeId && 'ring-1 ring-primary',
                )}
                onMouseEnter={() => setHoveredPlaceId(place.placeId)}
                onMouseLeave={() => setHoveredPlaceId(null)}
                onClick={() => {
                  setSelectedPlaceId(place.placeId);
                  setDetailOpen(true);
                }}
              >
                <CardContent className="space-y-2 p-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 truncate text-sm font-medium">{place.name}</p>
                    {place.distanceMiles != null ? (
                      <Badge variant="neutral">{place.distanceMiles.toFixed(1)} mi</Badge>
                    ) : null}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{place.address}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {place.rating != null ? (
                      <span className="flex items-center gap-1">
                        <Star className="size-3 fill-warning text-warning" aria-hidden />
                        {place.rating.toFixed(1)}
                        <span className="text-muted-foreground">({place.reviewCount ?? 0})</span>
                      </span>
                    ) : null}
                    {place.openNow != null ? (
                      <Badge variant={place.openNow ? 'success' : 'danger'}>
                        {place.openNow ? 'Open' : 'Closed'}
                      </Badge>
                    ) : null}
                  </div>
                  <div className="flex gap-1.5 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      onClick={(event) => event.stopPropagation()}
                    >
                      <a
                        href={directionsUrl(place.location, searchCenter)}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        <Navigation />
                        Navigate
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedPlaceId(place.placeId);
                        setDetailOpen(true);
                      }}
                    >
                      <ExternalLink />
                      Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <ShopDetailDialog
        details={details}
        loading={detailsLoading}
        error={detailsError}
        origin={searchCenter}
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) setSelectedPlaceId(null);
        }}
        category={category.id}
      />
    </div>
  );
}
