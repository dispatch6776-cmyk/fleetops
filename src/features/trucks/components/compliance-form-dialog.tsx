import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Section } from '@/components/common/section';
import { queryKeys } from '@/app/query-client';
import { upsertCompliance } from '../api/trucks.api';
import { blankToNull, complianceSchema, type ComplianceInput } from '../schemas';
import { toDateInput } from '@/lib/format';
import type { Compliance } from '@/types';

export function ComplianceFormDialog({
  truckId,
  compliance,
  open,
  onOpenChange,
}: {
  truckId: string;
  compliance: Compliance | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();

  const form = useForm<ComplianceInput>({
    resolver: zodResolver(complianceSchema),
    defaultValues: toDefaults(compliance),
  });

  useEffect(() => {
    if (open) form.reset(toDefaults(compliance));
  }, [open, compliance, form]);

  const mutation = useMutation({
    mutationFn: (values: ComplianceInput) => upsertCompliance(truckId, blankToNull(values)),
    onSuccess: () => {
      toast.success('Compliance records updated');
      void queryClient.invalidateQueries({ queryKey: queryKeys.compliance(truckId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(truckId) });
      onOpenChange(false);
    },
  });

  const { register, handleSubmit } = form;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Insurance, registration & compliance</DialogTitle>
          <DialogDescription>
            Expiry dates drive dashboard countdowns and renewal alerts 30 days ahead.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((values) => mutation.mutate(values))}
          className="space-y-6"
          noValidate
        >
          <Section title="Insurance">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FormField label="Provider" htmlFor="insurance_provider">
                <Input id="insurance_provider" {...register('insurance_provider')} />
              </FormField>
              <FormField label="Policy number" htmlFor="insurance_policy_number">
                <Input id="insurance_policy_number" className="font-mono" {...register('insurance_policy_number')} />
              </FormField>
              <FormField label="Agent phone" htmlFor="insurance_agent_phone">
                <Input id="insurance_agent_phone" type="tel" {...register('insurance_agent_phone')} />
              </FormField>
              <FormField label="Effective from" htmlFor="insurance_effective_on">
                <Input id="insurance_effective_on" type="date" {...register('insurance_effective_on')} />
              </FormField>
              <FormField label="Expires on" htmlFor="insurance_expires_on">
                <Input id="insurance_expires_on" type="date" {...register('insurance_expires_on')} />
              </FormField>
              <FormField label="Monthly premium" htmlFor="insurance_monthly_cost">
                <Input id="insurance_monthly_cost" type="number" step="0.01" {...register('insurance_monthly_cost')} />
              </FormField>
            </div>
          </Section>

          <Section title="Registration">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <FormField label="State" htmlFor="registration_state">
                <Input id="registration_state" maxLength={2} className="uppercase" {...register('registration_state')} />
              </FormField>
              <FormField label="Registration number" htmlFor="registration_number">
                <Input id="registration_number" className="font-mono" {...register('registration_number')} />
              </FormField>
              <FormField label="Expires on" htmlFor="registration_expires_on">
                <Input id="registration_expires_on" type="date" {...register('registration_expires_on')} />
              </FormField>
              <FormField label="Annual cost" htmlFor="registration_annual_cost">
                <Input id="registration_annual_cost" type="number" step="0.01" {...register('registration_annual_cost')} />
              </FormField>
            </div>
          </Section>

          <Section title="DOT & inspection">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <FormField label="DOT number" htmlFor="dot_number">
                <Input id="dot_number" className="font-mono" {...register('dot_number')} />
              </FormField>
              <FormField label="MC number" htmlFor="mc_number">
                <Input id="mc_number" className="font-mono" {...register('mc_number')} />
              </FormField>
              <FormField label="Last inspection" htmlFor="dot_inspection_on">
                <Input id="dot_inspection_on" type="date" {...register('dot_inspection_on')} />
              </FormField>
              <FormField label="Inspection expires" htmlFor="dot_inspection_expires_on">
                <Input id="dot_inspection_expires_on" type="date" {...register('dot_inspection_expires_on')} />
              </FormField>
            </div>
          </Section>

          <Section title="IFTA & ELD">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <FormField label="IFTA account" htmlFor="ifta_account">
                <Input id="ifta_account" className="font-mono" {...register('ifta_account')} />
              </FormField>
              <FormField label="IFTA expires" htmlFor="ifta_expires_on">
                <Input id="ifta_expires_on" type="date" {...register('ifta_expires_on')} />
              </FormField>
              <FormField label="ELD provider" htmlFor="eld_provider">
                <Input id="eld_provider" placeholder="Motive, Samsara…" {...register('eld_provider')} />
              </FormField>
              <FormField label="ELD device ID" htmlFor="eld_device_id">
                <Input id="eld_device_id" className="font-mono" {...register('eld_device_id')} />
              </FormField>
            </div>
          </Section>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              Save records
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function toDefaults(compliance: Compliance | null): ComplianceInput {
  return {
    insurance_provider: compliance?.insurance_provider ?? '',
    insurance_policy_number: compliance?.insurance_policy_number ?? '',
    insurance_effective_on: toDateInput(compliance?.insurance_effective_on),
    insurance_expires_on: toDateInput(compliance?.insurance_expires_on),
    insurance_monthly_cost: compliance?.insurance_monthly_cost ?? null,
    insurance_agent_phone: compliance?.insurance_agent_phone ?? '',
    registration_state: compliance?.registration_state ?? '',
    registration_number: compliance?.registration_number ?? '',
    registration_expires_on: toDateInput(compliance?.registration_expires_on),
    registration_annual_cost: compliance?.registration_annual_cost ?? null,
    dot_number: compliance?.dot_number ?? '',
    mc_number: compliance?.mc_number ?? '',
    dot_inspection_on: toDateInput(compliance?.dot_inspection_on),
    dot_inspection_expires_on: toDateInput(compliance?.dot_inspection_expires_on),
    ifta_account: compliance?.ifta_account ?? '',
    ifta_expires_on: toDateInput(compliance?.ifta_expires_on),
    eld_provider: compliance?.eld_provider ?? '',
    eld_device_id: compliance?.eld_device_id ?? '',
  } as ComplianceInput;
}
