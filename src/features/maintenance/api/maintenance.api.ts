import { requireSupabase } from '@/lib/supabase';
import type {
  DocumentRecord,
  MaintenanceCategory,
  MaintenancePart,
  MaintenanceRecord,
  MaintenanceRecordDetail,
  MaintenanceSchedule,
  MaintenanceStatus,
  TablesInsert,
  TablesUpdate,
} from '@/types';

export interface MaintenanceFilters {
  status?: MaintenanceStatus | 'all';
  category?: MaintenanceCategory | 'all';
  from?: string;
  to?: string;
}

export async function listMaintenance(
  truckId: string,
  filters: MaintenanceFilters = {},
): Promise<MaintenanceRecord[]> {
  const supabase = requireSupabase();
  let query = supabase
    .from('maintenance_records')
    .select('*')
    .eq('truck_id', truckId)
    .order('service_date', { ascending: false });

  if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status);
  if (filters.category && filters.category !== 'all') query = query.eq('category', filters.category);
  if (filters.from) query = query.gte('service_date', filters.from);
  if (filters.to) query = query.lte('service_date', filters.to);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getMaintenanceRecord(id: string): Promise<MaintenanceRecordDetail> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('maintenance_records')
    .select('*, parts:maintenance_parts(*), documents:documents(*)')
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);
  return data as unknown as MaintenanceRecordDetail;
}

export interface MaintenanceDraft {
  record: TablesInsert<'maintenance_records'>;
  parts?: Omit<TablesInsert<'maintenance_parts'>, 'maintenance_id'>[];
}

export async function createMaintenance({ record, parts }: MaintenanceDraft): Promise<MaintenanceRecord> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.from('maintenance_records').insert(record).select().single();
  if (error) throw new Error(error.message);

  if (parts?.length) {
    const { error: partsError } = await supabase
      .from('maintenance_parts')
      .insert(parts.map((part) => ({ ...part, maintenance_id: data.id })));
    if (partsError) throw new Error(partsError.message);
  }

  return data;
}

export async function updateMaintenance(
  id: string,
  patch: TablesUpdate<'maintenance_records'>,
  parts?: Omit<TablesInsert<'maintenance_parts'>, 'maintenance_id'>[],
): Promise<MaintenanceRecord> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('maintenance_records')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);

  if (parts) {
    const { error: deleteError } = await supabase
      .from('maintenance_parts')
      .delete()
      .eq('maintenance_id', id);
    if (deleteError) throw new Error(deleteError.message);

    if (parts.length) {
      const { error: insertError } = await supabase
        .from('maintenance_parts')
        .insert(parts.map((part) => ({ ...part, maintenance_id: id })));
      if (insertError) throw new Error(insertError.message);
    }
  }

  return data;
}

export async function deleteMaintenance(id: string): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from('maintenance_records').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function listParts(maintenanceId: string): Promise<MaintenancePart[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('maintenance_parts')
    .select('*')
    .eq('maintenance_id', maintenanceId);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listMaintenanceDocuments(maintenanceId: string): Promise<DocumentRecord[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('maintenance_id', maintenanceId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

// ---------------------------------------------------------------------------
// Preventive maintenance schedules
// ---------------------------------------------------------------------------
export async function listSchedules(truckId: string): Promise<MaintenanceSchedule[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('maintenance_schedules')
    .select('*')
    .eq('truck_id', truckId)
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createSchedule(
  payload: TablesInsert<'maintenance_schedules'>,
): Promise<MaintenanceSchedule> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.from('maintenance_schedules').insert(payload).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateSchedule(
  id: string,
  patch: TablesUpdate<'maintenance_schedules'>,
): Promise<MaintenanceSchedule> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('maintenance_schedules')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteSchedule(id: string): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from('maintenance_schedules').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function getMaintenanceCostByCategory(truckId: string) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('v_maintenance_cost_by_category')
    .select('*')
    .eq('truck_id', truckId);
  if (error) throw new Error(error.message);
  return data ?? [];
}
