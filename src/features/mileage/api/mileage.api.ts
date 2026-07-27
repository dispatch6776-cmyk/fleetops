import { requireSupabase } from '@/lib/supabase';
import type {
  FuelEconomy,
  FuelLog,
  MileageLog,
  MonthlyMileage,
  TablesInsert,
  TablesUpdate,
} from '@/types';

export async function listMileageLogs(truckId: string, limit = 400): Promise<MileageLog[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('mileage_logs')
    .select('*')
    .eq('truck_id', truckId)
    .order('log_date', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createMileageLog(payload: TablesInsert<'mileage_logs'>): Promise<MileageLog> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('mileage_logs')
    .upsert(payload, { onConflict: 'truck_id,log_date' })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateMileageLog(
  id: string,
  patch: TablesUpdate<'mileage_logs'>,
): Promise<MileageLog> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('mileage_logs')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteMileageLog(id: string): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from('mileage_logs').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/** Bulk import from CSV. Conflicting dates are updated rather than duplicated. */
export async function importMileageLogs(
  rows: TablesInsert<'mileage_logs'>[],
): Promise<{ inserted: number }> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('mileage_logs')
    .upsert(rows, { onConflict: 'truck_id,log_date' })
    .select('id');
  if (error) throw new Error(error.message);
  return { inserted: data?.length ?? 0 };
}

export async function getMonthlyMileage(truckId: string): Promise<MonthlyMileage[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('v_monthly_mileage')
    .select('*')
    .eq('truck_id', truckId)
    .order('month', { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * Fuel economy without cost columns — readable by every role.
 * Owners and administrators additionally get `listFuelLogs` with prices.
 */
export async function getFuelEconomy(truckId: string, limit = 120): Promise<FuelEconomy[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('v_fuel_economy')
    .select('*')
    .eq('truck_id', truckId)
    .order('fuel_date', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listFuelLogs(truckId: string, limit = 200): Promise<FuelLog[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('fuel_logs')
    .select('*')
    .eq('truck_id', truckId)
    .order('fuel_date', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createFuelLog(payload: TablesInsert<'fuel_logs'>): Promise<FuelLog> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.from('fuel_logs').insert(payload).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteFuelLog(id: string): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from('fuel_logs').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
