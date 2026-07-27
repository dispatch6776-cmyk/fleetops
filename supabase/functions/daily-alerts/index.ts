// =============================================================================
// FleetOps · Edge Function · daily-alerts
//
// Runs once a day (pg_cron or an external scheduler) and writes notification
// rows for anything expiring, due or overdue in the next 30 days. Uses the
// service-role key so it can read compliance data on behalf of every user, and
// deduplicates with the `dedupe_key` unique index so a repeated run never spams.
//
// Deploy:   supabase functions deploy daily-alerts
// Schedule: select cron.schedule('fleetops-daily-alerts', '0 13 * * *',
//             $$ select net.http_post(
//                  url := 'https://<project>.functions.supabase.co/daily-alerts',
//                  headers := jsonb_build_object('Authorization', 'Bearer <service-role-key>')
//                ) $$);
// =============================================================================

import { createClient } from 'jsr:@supabase/supabase-js@2';

const WINDOW_DAYS = 30;

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );

  const today = new Date();
  const horizon = new Date(today.getTime() + WINDOW_DAYS * 86_400_000)
    .toISOString()
    .slice(0, 10);

  const notifications: Record<string, unknown>[] = [];

  // Recipients: everyone who wants the relevant alert type.
  const { data: recipients } = await supabase
    .from('profiles')
    .select('id, role, notification_preferences(compliance_alerts, maintenance_alerts, payment_alerts)')
    .eq('is_active', true);

  const users = recipients ?? [];

  // ---- Compliance expiries -------------------------------------------------
  const { data: compliance } = await supabase
    .from('v_compliance_status')
    .select('*')
    .lte('expires_on', horizon);

  for (const item of compliance ?? []) {
    for (const user of users) {
      const prefs = (user as { notification_preferences?: { compliance_alerts?: boolean }[] })
        .notification_preferences?.[0];
      if (prefs && prefs.compliance_alerts === false) continue;

      notifications.push({
        user_id: user.id,
        type: item.item === 'insurance' ? 'insurance_expiring' : 'registration_expiring',
        severity: item.days_remaining < 0 ? 'critical' : item.days_remaining <= 14 ? 'warning' : 'info',
        title:
          item.days_remaining < 0
            ? `${item.item.replace('_', ' ')} expired`
            : `${item.item.replace('_', ' ')} expires in ${item.days_remaining} days`,
        body: item.reference ?? null,
        href: '/truck',
        entity_type: 'truck_compliance',
        entity_id: item.truck_id,
        due_date: item.expires_on,
        dedupe_key: `compliance:${item.item}:${item.expires_on}`,
      });
    }
  }

  // ---- Services due --------------------------------------------------------
  const { data: services } = await supabase
    .from('v_upcoming_services')
    .select('*')
    .neq('urgency', 'scheduled');

  for (const service of services ?? []) {
    for (const user of users) {
      const prefs = (user as { notification_preferences?: { maintenance_alerts?: boolean }[] })
        .notification_preferences?.[0];
      if (prefs && prefs.maintenance_alerts === false) continue;
      if (user.role === 'viewer') continue;

      notifications.push({
        user_id: user.id,
        type: service.urgency === 'overdue' ? 'maintenance_overdue' : 'maintenance_due',
        severity: service.urgency === 'overdue' ? 'critical' : 'warning',
        title:
          service.urgency === 'overdue'
            ? `${service.name} is overdue`
            : `${service.name} is due soon`,
        body:
          service.miles_remaining != null
            ? `${Math.max(0, service.miles_remaining)} miles remaining`
            : service.next_due_date
              ? `Due ${service.next_due_date}`
              : null,
        href: '/maintenance',
        entity_type: 'maintenance_schedules',
        entity_id: service.id,
        due_date: service.next_due_date,
        dedupe_key: `service:${service.id}:${service.next_due_date ?? service.next_due_odometer}`,
      });
    }
  }

  // ---- Overdue invoices (financial roles only) -----------------------------
  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, invoice_number, due_date, balance, status')
    .in('status', ['sent', 'partial', 'overdue'])
    .lte('due_date', horizon);

  for (const invoice of invoices ?? []) {
    for (const user of users.filter((item) => ['owner', 'admin'].includes(item.role as string))) {
      const prefs = (user as { notification_preferences?: { payment_alerts?: boolean }[] })
        .notification_preferences?.[0];
      if (prefs && prefs.payment_alerts === false) continue;

      const overdue = invoice.due_date < today.toISOString().slice(0, 10);
      notifications.push({
        user_id: user.id,
        type: overdue ? 'payment_late' : 'payment_due',
        severity: overdue ? 'critical' : 'info',
        title: overdue
          ? `${invoice.invoice_number} is overdue`
          : `${invoice.invoice_number} is due ${invoice.due_date}`,
        body: `Balance ${Number(invoice.balance).toFixed(2)}`,
        href: '/invoices',
        entity_type: 'invoices',
        entity_id: invoice.id,
        due_date: invoice.due_date,
        dedupe_key: `invoice:${invoice.id}:${invoice.due_date}`,
      });
    }
  }

  if (notifications.length === 0) {
    return Response.json({ created: 0, message: 'Nothing due in the alert window.' });
  }

  const { error } = await supabase
    .from('notifications')
    .upsert(notifications, { onConflict: 'user_id,dedupe_key', ignoreDuplicates: true });

  if (error) {
    console.error('daily-alerts insert failed', error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ created: notifications.length });
});
