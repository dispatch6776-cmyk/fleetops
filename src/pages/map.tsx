import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/leaflet.css';
import {
  Crosshair,
  ExternalLink,
  MapPin,
  Navigation,
  RefreshCw,
  Search,
  Truck as TruckIcon,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/common/empty-state';
import { ErrorState } from '@/components/common/error-state';
import { PageHeader } from '@/components/common/page-header';
import { ShopDetailDialog } from '@/features/map/components/shop-detail-dialog';
import { BRAND_FILTERS, DEFAULT_CENTER, DISTANCE_OPTIONS, SHOP_CATEGORIES, TILE_LAYERS } from '@/features/map/constants';
import { directionsUrl } from '@/features/map/api/places';
import { useBrowserLocation, useLocationSearch, useNearbyPlaces, usePlaceDetails } from '@/features/map/hooks';
import { useActiveTruck, useLatestLocation } from '@/features/trucks/hooks';
import { useTheme } from '@/hooks/use-theme';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';

// Fix the classic Leaflet + bundler issue where the default marker image
// paths resolve to nothing — point them at the bundled assets explicitly.
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

/** Recenters/zooms an existing Leaflet map instance when the target changes. */
function MapRecenter({ center, zoom }: { center: { lat: number; lng: number }; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng], zoom);
  }, [map, center.lat, center.lng, zoom]);
  return null;
}

export default function MapPage() {
  const { truck, truckId } = useActiveTruck();
  const truckLocation = useLatestLocation(truckId);
  const { resolved } = useTheme();

  const [categoryId, setCategoryId] = useState(SHOP_CATEGORIES[0].id);
  const [brandId, setBrandId] = useState('all');
  const [radius, setRadius] = useState('40234');
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [hoveredPlaceId, setHoveredPlaceId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [manualCenter, setManualCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [manualLabel, setManualLabel] = useState<string | null>(null);

  const truckPosition = useMemo(
    () =>
      truckLocation.data
        ? { lat: Number(truckLocation.data.latitude), lng: Number(truckLocation.data.longitude) }
        : null,
    [truckLocation.data],
  );

  const { center: geoCenter, position: browserPosition, denied, request } = useBrowserLocation(truckPosition);
  const searchCenter = manualCenter ?? geoCenter ?? DEFAULT_CENTER;

  const locationSearch = useLocationSearch();

  const category = SHOP_CATEGORIES.find((item) => item.id === categoryId) ?? SHOP_CATEGORIES[0];
  const brand = BRAND_FILTERS.find((item) => item.id === brandId);

  const { places, loading, error, refresh } = useNearbyPlaces({
    center: searchCenter,
    radius: Number(radius),
    category,
    nameRegexOverride: brand?.nameRegex,
    enabled: true,
  });

  const { details, loading: detailsLoading, error: detailsError } = usePlaceDetails(selectedPlaceId, searchCenter);

  const tileLayer = resolved === 'dark' ? TILE_LAYERS.dark : TILE_LAYERS.light;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Map & service shops"
        description={
          truck
            ? `Repair shops, truck stops, dealers and towing near ${truck.truck_number} — free, powered by OpenStreetMap.`
            : 'Repair shops, truck stops, dealers and towing — free, powered by OpenStreetMap.'
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
        <form
          className="relative flex w-full max-w-sm items-center gap-1.5 sm:w-72"
          onSubmit={(event) => {
            event.preventDefault();
            void locationSearch.search();
          }}
        >
          <Search className="pointer-events-none absolute left-2.5 size-4 text-muted-foreground" aria-hidden />
          <Input
            className="pl-8"
            placeholder="Search a city, address or zip…"
            value={locationSearch.query}
            onChange={(event) => locationSearch.setQuery(event.target.value)}
            aria-label="Search location"
          />
          {locationSearch.query ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="absolute right-1"
              onClick={() => {
                locationSearch.setQuery('');
                locationSearch.clear();
              }}
            >
              <X className="size-3.5" />
            </Button>
          ) : null}
        </form>

        {locationSearch.results.length > 0 ? (
          <div className="flex w-full flex-col gap-1 rounded-lg border border-border bg-surface p-1.5 sm:w-72">
            {locationSearch.results.map((result) => (
              <button
                key={`${result.lat}-${result.lng}`}
                type="button"
                className="truncate rounded-md px-2 py-1.5 text-left text-xs hover:bg-surface-muted"
                onClick={() => {
                  setManualCenter({ lat: result.lat, lng: result.lng });
                  setManualLabel(result.label);
                  locationSearch.clear();
                }}
              >
                {result.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

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
      </div>

      {manualLabel ? (
        <p className="flex items-center gap-2 rounded-lg border border-border bg-surface-muted/50 px-3 py-2 text-xs text-muted-foreground">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">Searching near {manualLabel}</span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-6 px-2 text-xs"
            onClick={() => {
              setManualCenter(null);
              setManualLabel(null);
            }}
          >
            Clear
          </Button>
        </p>
      ) : denied && !browserPosition ? (
        <p className="rounded-lg border border-border bg-surface-muted/50 px-3 py-2 text-xs text-muted-foreground">
          Location access was declined — searching around the truck&apos;s last reported position instead.
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <Card className="overflow-hidden p-0">
          <MapContainer
            key={tileLayer.url}
            center={[searchCenter.lat, searchCenter.lng]}
            zoom={10}
            style={{ width: '100%', height: '32rem' }}
            scrollWheelZoom
          >
            <MapRecenter center={searchCenter} zoom={10} />
            <TileLayer url={tileLayer.url} attribution={tileLayer.attribution} />

            {truckPosition ? (
              <CircleMarker
                center={[truckPosition.lat, truckPosition.lng]}
                radius={9}
                pathOptions={{ color: '#ffffff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }}
              >
                <Tooltip direction="top">{truck ? `${truck.truck_number} — last known position` : 'Truck'}</Tooltip>
              </CircleMarker>
            ) : null}

            {places.map((place) => (
              <Marker
                key={place.placeId}
                position={[place.location.lat, place.location.lng]}
                eventHandlers={{
                  click: () => {
                    setSelectedPlaceId(place.placeId);
                    setDetailOpen(true);
                  },
                  mouseover: () => setHoveredPlaceId(place.placeId),
                  mouseout: () => setHoveredPlaceId(null),
                }}
              >
                <Tooltip direction="top">
                  {place.name}
                  {place.distanceMiles != null ? ` · ${place.distanceMiles.toFixed(1)} mi` : ''}
                </Tooltip>
              </Marker>
            ))}
          </MapContainer>
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
            <div className="flex justify-center py-10">
              <Spinner label="Searching OpenStreetMap" />
            </div>
          ) : places.length === 0 && !error ? (
            <EmptyState
              compact
              icon={MapPin}
              title="Nothing found nearby"
              description="Try a wider radius or a different category. Coverage depends on OpenStreetMap data in this area."
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
                  <p className="truncate text-xs text-muted-foreground">
                    {place.address || 'Address not mapped yet'}
                  </p>
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
