# FleetOps database

PostgreSQL 15 on Supabase. Twenty-six tables, eight reporting views, twelve
trigger functions and row-level security on every table.

## Migration order

| File | Contents |
| --- | --- |
| `0001_enums_and_helpers` | Extensions, 19 enum types, RLS helper functions |
| `0002_core_tables` | profiles, trucks, truck_compliance, drivers, rental_companies, rental_agreements |
| `0003_operations` | maintenance_records, maintenance_parts, maintenance_schedules, mileage_logs, fuel_logs, documents, private_notes, service_shops, truck_locations |
| `0004_financials` | invoices, invoice_line_items, payments, expenses |
| `0005_system` | notifications, notification_preferences, audit_logs, login_history, app_settings, ai_conversations, ai_messages |
| `0006_functions_triggers` | Derived data, audit trail, invoice maths, schedule advancement |
| `0007_views` | Reporting views |
| `0008_rls_policies` | Row-level security and grants |
| `0009_storage` | Buckets and object policies |
| `0010_global_search` | `global_search()` — cross-entity search used by the command palette and `/search` |
| `seed.sql` | 18 months of sample operating history |

Apply with `supabase db push`, or paste each file into the Supabase SQL editor
in the order above.

## Entity relationships

```
auth.users ──1:1── profiles
                     │
trucks ──1:1── truck_compliance
  │
  ├──1:N── rental_agreements ──N:1── rental_companies
  │              │                └─ drivers
  │              └──1:N── invoices ──1:N── invoice_line_items
  │                            └──1:N── payments
  ├──1:N── maintenance_records ──1:N── maintenance_parts
  │                └──1:N── documents (photos, shop invoices)
  ├──1:N── maintenance_schedules
  ├──1:N── mileage_logs
  ├──1:N── fuel_logs
  ├──1:N── expenses
  ├──1:N── documents
  └──1:N── truck_locations
```

## Data the database maintains for you

| Trigger | Effect |
| --- | --- |
| `handle_new_user` | Creates a profile on sign-up. **The first account becomes the Owner**; later accounts default to Viewer until promoted. |
| `mileage_derive` | Computes `miles_driven` from the previous reading. |
| `sync_truck_odometer` | Pushes the newest odometer onto the truck row. |
| `fuel_derive` | Computes miles since last fill-up and MPG. |
| `recalculate_invoice_totals` | Recomputes subtotal, tax and total from line items. |
| `recalculate_invoice_payments` | Recomputes amount paid and moves status through draft → sent → partial → paid/overdue. |
| `flag_late_payment` | Marks payments received after the due date. |
| `sync_maintenance_expense` | Mirrors every completed, non-warranty work order into the expense ledger (one expense per work order, kept in sync, deleted with it). |
| `sync_fuel_expense` | Same for fuel and DEF purchases. |
| `advance_maintenance_schedule` | Moves the matching PM schedule forward when a service is completed. |
| `assign_invoice_number` | Allocates the next number from `app_settings`. |
| `audit_changes` | Writes a field-level diff to `audit_logs` for 13 tables. |
| `guard_profile_role_change` | Blocks privilege escalation and protects the last Owner. |

Because costs flow from maintenance and fuel into `expenses` automatically, the
P&L can never drift from the operational records.

## Security model

Helper functions (`is_admin()`, `can_edit_maintenance()`, `can_view_operations()`,
`is_authenticated_member()`) are `SECURITY DEFINER` with a locked `search_path`,
so policies can read `profiles` without recursive policy evaluation.

| Data | Owner / Admin | Maintenance | Mechanic | Viewer |
| --- | --- | --- | --- | --- |
| Trucks, compliance, drivers | read + write | read | read | read |
| Maintenance, parts, schedules | full | read + write | read + write | read |
| Mileage logs | full | read + write | ✗ | read |
| Fuel logs (with cost) | full | ✗ | ✗ | ✗ |
| Fuel economy view (no cost) | read | read | read | read |
| Invoices, payments, expenses, rental terms | full | ✗ | ✗ | ✗ |
| Documents | all | non-financial only | non-financial only | non-financial only |
| Private notes | full | ✗ | ✗ | ✗ |
| Audit log, login history | read | ✗ | ✗ | ✗ |

Two details worth knowing:

1. **Row policies cannot hide a column**, so anything a maintenance user must
   never see lives in a separate table (`private_notes`) or a separate bucket
   (`financial-documents`). Fuel *economy* is exposed through the
   `v_fuel_economy` view, which deliberately omits price columns.
2. **Views default to the definer's privileges.** Financial views are declared
   `with (security_invoker = on)` so RLS still applies to the caller. The two
   non-financial views omit it on purpose and are granted explicitly.

## Storage buckets

| Bucket | Public | Who can read | Who can write |
| --- | --- | --- | --- |
| `documents` | no | all members | maintenance-capable roles |
| `financial-documents` | no | Owner / Admin | Owner / Admin |
| `maintenance-photos` | no | all members | maintenance-capable roles |
| `avatars` | yes | anyone | the owning user |

## Seed data

`seed.sql` loads one 2021 Freightliner Cascadia with 18 months of history:
78 weekly odometer readings, ~90 fuel purchases, 14 maintenance records, 6
invoices with line items, 20 rent payments, a deposit, a late fee, a mileage
overage and recurring insurance, registration, IFTA and tax expenses. Every
dashboard, chart and report therefore has real numbers on first load.

Remove it with:

```sql
delete from public.trucks where id = '5b9f7d64-2f21-4f3c-9d7e-1c0a8b6d2e11';
```
