import { Globe, Navigation, Phone, Star, Clock, MapPin, BookmarkPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { ErrorState } from '@/components/common/error-state';
import { PermissionGate } from '@/components/common/permission-gate';
import { directionsUrl, type PlaceDetails } from '../api/places';
import { useShopMutations } from '../hooks';

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          className={`size-3.5 ${
            value <= Math.round(rating) ? 'fill-warning text-warning' : 'text-muted-foreground/40'
          }`}
          aria-hidden
        />
      ))}
    </span>
  );
}

export function ShopDetailDialog({
  details,
  loading,
  error,
  origin,
  open,
  onOpenChange,
  category,
}: {
  details: PlaceDetails | null;
  loading: boolean;
  error: string | null;
  origin?: { lat: number; lng: number } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: string;
}) {
  const { save } = useShopMutations();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-h-[90dvh] overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner label="Loading shop details" />
          </div>
        ) : error ? (
          <ErrorState title="Could not load this shop" description={error} />
        ) : details ? (
          <>
            <DialogHeader>
              <DialogTitle>{details.name}</DialogTitle>
              <DialogDescription className="flex flex-wrap items-center gap-2">
                <MapPin className="size-3.5" aria-hidden />
                {details.address}
              </DialogDescription>
            </DialogHeader>

            {details.photos.length > 0 ? (
              <div className="-mx-1 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {details.photos.map((photo, index) => (
                  <img
                    key={photo}
                    src={photo}
                    alt={`${details.name} photo ${index + 1}`}
                    loading="lazy"
                    className="h-32 w-48 shrink-0 rounded-lg object-cover"
                  />
                ))}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              {details.rating != null ? (
                <span className="flex items-center gap-1.5 text-sm">
                  <Stars rating={details.rating} />
                  <span className="font-medium">{details.rating.toFixed(1)}</span>
                  <span className="text-muted-foreground">({details.reviewCount ?? 0} reviews)</span>
                </span>
              ) : null}
              {details.openNow != null ? (
                <Badge variant={details.openNow ? 'success' : 'danger'}>
                  {details.openNow ? 'Open now' : 'Closed'}
                </Badge>
              ) : null}
              {details.is24Hours ? <Badge variant="info">Open 24 hours</Badge> : null}
              {details.distanceMiles != null ? (
                <Badge variant="neutral">{details.distanceMiles.toFixed(1)} mi away</Badge>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <a href={directionsUrl(details.location, origin ?? undefined)} target="_blank" rel="noreferrer noopener">
                  <Navigation />
                  Navigate
                </a>
              </Button>
              {details.phone ? (
                <Button variant="outline" asChild>
                  <a href={`tel:${details.internationalPhone ?? details.phone}`}>
                    <Phone />
                    {details.phone}
                  </a>
                </Button>
              ) : null}
              {details.website ? (
                <Button variant="outline" asChild>
                  <a href={details.website} target="_blank" rel="noreferrer noopener">
                    <Globe />
                    Website
                  </a>
                </Button>
              ) : null}
              <PermissionGate permission="maintenance.edit">
                <Button
                  variant="outline"
                  loading={save.isPending}
                  onClick={() =>
                    save.mutate({
                      name: details.name,
                      category,
                      place_id: details.placeId,
                      phone: details.phone,
                      website: details.website,
                      address: details.address,
                      latitude: details.location.lat,
                      longitude: details.location.lng,
                      rating: details.rating,
                      review_count: details.reviewCount,
                      is_24_hours: details.is24Hours,
                      hours: { weekday_text: details.openingHours },
                      is_favorite: true,
                    })
                  }
                >
                  <BookmarkPlus />
                  Save to my shops
                </Button>
              </PermissionGate>
            </div>

            {details.openingHours.length > 0 ? (
              <>
                <Separator />
                <section className="space-y-2">
                  <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                    <Clock className="size-4" aria-hidden />
                    Opening hours
                  </h3>
                  <ul className="grid gap-1 text-sm sm:grid-cols-2">
                    {details.openingHours.map((line) => (
                      <li key={line} className="text-muted-foreground">
                        {line}
                      </li>
                    ))}
                  </ul>
                </section>
              </>
            ) : null}

            {details.reviews.length > 0 ? (
              <>
                <Separator />
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold">Recent reviews</h3>
                  <ul className="space-y-3">
                    {details.reviews.map((review, index) => (
                      <li key={`${review.author}-${index}`} className="rounded-lg border border-border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium">{review.author}</span>
                          <span className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Stars rating={review.rating} />
                            {review.relativeTime}
                          </span>
                        </div>
                        {review.text ? (
                          <p className="mt-1.5 line-clamp-4 text-sm text-muted-foreground">{review.text}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </section>
              </>
            ) : null}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
