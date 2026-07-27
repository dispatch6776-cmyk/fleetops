import { FileText, Gauge, MapPin, Receipt, Truck, Wrench } from 'lucide-react';
import type { SearchEntityType } from '@/types';

export const SEARCH_ENTITY_LABELS: Record<SearchEntityType, string> = {
  truck: 'Truck',
  invoice: 'Invoice',
  maintenance: 'Maintenance & repairs',
  mileage: 'Mileage & fuel',
  document: 'Document',
  shop: 'Service shop',
};

export const SEARCH_ENTITY_ICONS: Record<SearchEntityType, typeof Truck> = {
  truck: Truck,
  invoice: Receipt,
  maintenance: Wrench,
  mileage: Gauge,
  document: FileText,
  shop: MapPin,
};

/** Display order for grouped results — most-actionable entities first. */
export const SEARCH_ENTITY_ORDER: SearchEntityType[] = [
  'maintenance',
  'truck',
  'invoice',
  'document',
  'mileage',
  'shop',
];
