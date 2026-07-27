import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { CalendarDays, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SkeletonCard } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/common/page-header';
import { PermissionGate } from '@/components/common/permission-gate';
import { buildCalendarEvents, EVENT_COLORS, EVENT_LEGEND } from '@/features/calendar/events';
import { useComplianceStatus } from '@/features/dashboard/hooks';
import { useInvoices } from '@/features/financials/hooks';
import { useMaintenanceRecords, useSchedules } from '@/features/maintenance/hooks';
import { useActiveTruck } from '@/features/trucks/hooks';
import { usePermissions } from '@/hooks/use-permissions';

export default function CalendarPage() {
  const navigate = useNavigate();
  const { truckId } = useActiveTruck();
  const { canSeeMoney } = usePermissions();
  const calendarRef = useRef<React.ElementRef<typeof FullCalendar> | null>(null);
  const [hiddenKinds, setHiddenKinds] = useState<string[]>([]);

  const maintenance = useMaintenanceRecords(truckId);
  const schedules = useSchedules(truckId);
  const invoices = useInvoices(truckId);
  const compliance = useComplianceStatus(truckId);

  const events = useMemo(
    () =>
      buildCalendarEvents({
        maintenance: maintenance.data ?? [],
        schedules: schedules.data ?? [],
        invoices: canSeeMoney ? (invoices.data ?? []) : [],
        compliance: compliance.data ?? [],
      }).filter((event) => !hiddenKinds.includes(event.kind)),
    [maintenance.data, schedules.data, invoices.data, compliance.data, canSeeMoney, hiddenKinds],
  );

  const loading =
    maintenance.isLoading || schedules.isLoading || compliance.isLoading || invoices.isLoading;

  function handleEventClick(info: { jsEvent: MouseEvent; event: { extendedProps: Record<string, unknown> } }) {
    info.jsEvent.preventDefault();
    const href = info.event.extendedProps.href as string | undefined;
    if (href) navigate(href);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Calendar"
        description="Services, renewals, inspections and payment due dates in one view."
        actions={
          <PermissionGate permission="maintenance.edit">
            <Button onClick={() => navigate('/maintenance?new=1')}>
              <Plus />
              Schedule work
            </Button>
          </PermissionGate>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {EVENT_LEGEND.filter((item) => canSeeMoney || item.kind !== 'payment_due').map((item) => {
          const hidden = hiddenKinds.includes(item.kind);
          return (
            <button
              key={item.kind}
              type="button"
              onClick={() =>
                setHiddenKinds((current) =>
                  current.includes(item.kind)
                    ? current.filter((kind) => kind !== item.kind)
                    : [...current, item.kind],
                )
              }
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-opacity ${
                hidden ? 'border-border opacity-40' : 'border-transparent'
              }`}
              style={
                hidden
                  ? undefined
                  : { background: EVENT_COLORS[item.kind].bg, color: EVENT_COLORS[item.kind].text }
              }
              aria-pressed={!hidden}
            >
              <span
                className="size-2 rounded-full"
                style={{ background: EVENT_COLORS[item.kind].text }}
                aria-hidden
              />
              {item.label}
            </button>
          );
        })}
        <Badge variant="neutral" className="ml-auto">
          <CalendarDays aria-hidden />
          {events.length} events
        </Badge>
      </div>

      {loading ? (
        <SkeletonCard className="h-[36rem]" />
      ) : (
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="fleet-calendar">
              <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth,timeGridWeek,listMonth',
                }}
                buttonText={{ today: 'Today', month: 'Month', week: 'Week', list: 'List' }}
                events={events}
                eventClick={handleEventClick}
                height="auto"
                firstDay={1}
                dayMaxEvents={3}
                eventDisplay="block"
                nowIndicator
                stickyHeaderDates
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
