import { requireSupabase } from '@/lib/supabase';
import type {
  Compliance,
  RentalAgreement,
  RentalCompany,
  Truck,
  TruckLocation,
  TablesUpdate,
  Driver,
} from '@/types';

export async function listTrucks(): Promise<Truck[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('trucks')
    .select('*')
    .order('truck_number', { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getTruck(id: string): Promise<Truck> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.from('trucks').select('*').eq('id', id).single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateTruck(id: string, patch: TablesUpdate<'trucks'>): Promise<Truck> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('trucks')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function getCompliance(truckId: string): Promise<Compliance | null> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('truck_compliance')
    .select('*')
    .eq('truck_id', truckId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function upsertCompliance(
  truckId: string,
  patch: TablesUpdate<'truck_compliance'>,
): Promise<Compliance> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('truck_compliance')
    .upsert({ ...patch, truck_id: truckId }, { onConflict: 'truck_id' })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export interface ActiveRental extends RentalAgreement {
  rental_company: RentalCompany | null;
  driver: Driver | null;
}

export async function getActiveRental(truckId: string): Promise<ActiveRental | null> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('rental_agreements')
    .select('*, rental_company:rental_companies(*), driver:drivers(*)')
    .eq('truck_id', truckId)
    .eq('status', 'active')
    .maybeSingle();
  if (error) {
    // Non-financial roles cannot read rental terms — that is expected, not an error.
    if (error.code === 'PGRST301' || error.code === '42501') return null;
    throw new Error(error.message);
  }
  return data as unknown as ActiveRental | null;
}

export async function getLatestLocation(truckId: string): Promise<TruckLocation | null> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('truck_locations')
    .select('*')
    .eq('truck_id', truckId)
    .order('recorded_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}
