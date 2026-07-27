import { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  Info,
  Send,
  Sparkles,
  TrendingUp,
  User,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SkeletonCard } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { PageHeader } from '@/components/common/page-header';
import { askAssistant } from '@/features/ai/api/assistant.api';
import { buildAllInsights, buildModelContext, type Insight, type InsightTone } from '@/features/ai/insights';
import { useMonthlyFinancials, useUpcomingServices } from '@/features/dashboard/hooks';
import { useExpenses, usePayments } from '@/features/financials/hooks';
import { useMaintenanceCosts, useMaintenanceRecords } from '@/features/maintenance/hooks';
import { useMonthlyMileage } from '@/features/mileage/hooks';
import { useActiveTruck } from '@/features/trucks/hooks';
import { usePermissions } from '@/hooks/use-permissions';
import { cn } from '@/lib/utils';

const TONE_STYLES: Record<InsightTone, { badge: string; icon: typeof Info }> = {
  positive: { badge: 'success', icon: CheckCircle2 },
  neutral: { badge: 'neutral', icon: Info },
  warning: { badge: 'warning', icon: AlertTriangle },
  critical: { badge: 'danger', icon: AlertTriangle },
};

const SUGGESTED_QUESTIONS = [
  'Which category is driving my costs up this quarter?',
  'Is this truck making money after maintenance?',
  'What should I budget for maintenance over the next three months?',
  'Are any repairs repeating more often than they should?',
  'How reliable has the renter been with payments?',
];

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  error?: boolean;
}

export default function AssistantPage() {
  const { truck, truckId } = useActiveTruck();
  const { canSeeMoney } = usePermissions();

  const months = useMonthlyFinancials(truckId, 24);
  const expenses = useExpenses(truckId);
  const payments = usePayments(truckId);
  const maintenance = useMaintenanceRecords(truckId);
  const maintenanceCosts = useMaintenanceCosts(truckId);
  const upcoming = useUpcomingServices(truckId);
  const mileage = useMonthlyMileage(truckId);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [pending, setPending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const input = useMemo(
    () => ({
      months: months.data ?? [],
      expenses: expenses.data ?? [],
      payments: payments.data ?? [],
      maintenance: maintenance.data ?? [],
      maintenanceCosts: maintenanceCosts.data ?? [],
      upcoming: upcoming.data ?? [],
      mileage: mileage.data ?? [],
      odometer: truck?.odometer ?? 0,
    }),
    [months.data, expenses.data, payments.data, maintenance.data, maintenanceCosts.data, upcoming.data, mileage.data, truck],
  );

  const insights = useMemo<Insight[]>(() => {
    const all = buildAllInsights(input);
    return canSeeMoney
      ? all
      : all.filter((insight) => ['maintenance-forecast', 'cost-anomalies', 'recommendations'].includes(insight.id));
  }, [input, canSeeMoney]);

  const loading =
    months.isLoading || maintenance.isLoading || upcoming.isLoading || mileage.isLoading;

  async function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || pending) return;

    const userMessage: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content: trimmed };
    setMessages((current) => [...current, userMessage]);
    setQuestion('');
    setPending(true);

    try {
      const reply = await askAssistant(
        trimmed,
        buildModelContext(input),
        messages.map((message) => ({ role: message.role, content: message.content })),
      );
      setMessages((current) => [
        ...current,
        { id: `a-${Date.now()}`, role: 'assistant', content: reply.answer },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          error: true,
          content:
            error instanceof Error
              ? `${error.message}\n\nThe analysis cards on this page are calculated locally and stay available without the model.`
              : 'The assistant is unavailable right now.',
        },
      ]);
    } finally {
      setPending(false);
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
      });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI assistant"
        description="Automatic analysis of your truck's costs, maintenance and profitability — plus a place to ask anything."
      />

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" aria-hidden />
          <h2 className="text-sm font-semibold">Analysis</h2>
          <Badge variant="neutral">Calculated from your data</Badge>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonCard key={index} className="h-44" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {insights.map((insight) => {
              const style = TONE_STYLES[insight.tone];
              const Icon = style.icon;
              return (
                <Card key={insight.id} className="flex h-full flex-col">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-sm">{insight.title}</CardTitle>
                      <span
                        className={cn(
                          'flex size-7 items-center justify-center rounded-lg',
                          insight.tone === 'positive' && 'bg-success-soft text-success',
                          insight.tone === 'neutral' && 'bg-secondary text-muted-foreground',
                          insight.tone === 'warning' && 'bg-warning-soft text-warning',
                          insight.tone === 'critical' && 'bg-danger-soft text-danger',
                        )}
                      >
                        <Icon className="size-3.5" aria-hidden />
                      </span>
                    </div>
                    <p className="text-base font-semibold tracking-tight">{insight.headline}</p>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-3">
                    <p className="text-sm text-muted-foreground">{insight.detail}</p>
                    {insight.bullets?.length ? (
                      <ul className="space-y-1.5">
                        {insight.bullets.map((bullet, index) => (
                          <li key={index} className="flex gap-2 text-xs text-muted-foreground">
                            <span className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground/60" aria-hidden />
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BrainCircuit className="size-4 text-primary" aria-hidden />
            Ask about this truck
          </CardTitle>
          <CardDescription>
            Questions are answered from your own records. Nothing is shared beyond the snapshot sent
            to the model.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            ref={scrollRef}
            className="max-h-96 space-y-3 overflow-y-auto rounded-lg border border-border bg-surface-muted/30 p-4"
          >
            {messages.length === 0 ? (
              <div className="space-y-3 py-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Ask a question, or start with one of these:
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {SUGGESTED_QUESTIONS.filter(
                    (item) => canSeeMoney || !/cost|money|budget|payment|profit/i.test(item),
                  ).map((item) => (
                    <Button key={item} variant="outline" size="sm" onClick={() => void submit(item)}>
                      {item}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={cn('flex gap-3', message.role === 'user' && 'flex-row-reverse')}
                >
                  <span
                    className={cn(
                      'flex size-7 shrink-0 items-center justify-center rounded-lg',
                      message.role === 'user'
                        ? 'bg-secondary text-foreground'
                        : message.error
                          ? 'bg-danger-soft text-danger'
                          : 'bg-primary/12 text-primary',
                    )}
                  >
                    {message.role === 'user' ? (
                      <User className="size-3.5" aria-hidden />
                    ) : (
                      <BrainCircuit className="size-3.5" aria-hidden />
                    )}
                  </span>
                  <div
                    className={cn(
                      'max-w-[85%] whitespace-pre-wrap rounded-xl px-3.5 py-2.5 text-sm',
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : message.error
                          ? 'border border-danger/30 bg-danger-soft/50'
                          : 'border border-border bg-card',
                    )}
                  >
                    {message.content}
                  </div>
                </div>
              ))
            )}

            {pending ? (
              <div className="flex items-center gap-2 pl-10">
                <Spinner label="Analysing your data" />
              </div>
            ) : null}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submit(question);
            }}
            className="flex gap-2"
          >
            <Input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="e.g. What did I spend on tyres last year?"
              aria-label="Ask the assistant"
              disabled={pending}
            />
            <Button type="submit" disabled={pending || !question.trim()}>
              <Send />
              Ask
            </Button>
          </form>

          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <TrendingUp className="size-3.5" aria-hidden />
            The cards above are computed locally and always work. Free-form questions require the
            <code className="mx-1 rounded bg-muted px-1 font-mono">ai-assistant</code> Edge Function
            to be deployed.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
