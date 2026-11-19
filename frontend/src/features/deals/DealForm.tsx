import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { Field } from "../../components/Field";
import { Modal } from "../../components/Modal";
import { useToast } from "../../components/Toast";
import { api } from "../../lib/api";
import { poundsToPence } from "../../lib/format";
import { applyServerErrors, asNumber } from "../../lib/forms";
import { useContactOptions, useOrganizationOptions, useRefreshAll } from "../../lib/queries";
import { defaultProbability, probabilityIsFixed, STAGES, type Stage } from "../../lib/stages";
import type { Deal, Organization } from "../../lib/types";
import { FormSkeleton } from "../../components/Skeleton";
import { dealSchema, type ContactOption, type DealValues } from "./schema";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal?: Deal;
  /** Pre-filled values for a new deal, such as the column's stage on the pipeline. */
  defaults?: { stage?: Stage; organizationId?: number; contactId?: number };
  onSaved?: (deal: Deal) => void;
};

export function DealForm({ open, onOpenChange, ...rest }: Props) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={rest.deal ? "Edit deal" : "New deal"}>
      {open && <DealFormLoader {...rest} onDone={() => onOpenChange(false)} />}
    </Modal>
  );
}

type BodyProps = Omit<Props, "open" | "onOpenChange"> & { onDone: () => void };

/** Wait for the pickers' options, so pre-filled values show as selected. */
function DealFormLoader(props: BodyProps) {
  const organizations = useOrganizationOptions();
  const startingOrganization = props.deal?.organization_id ?? props.defaults?.organizationId;
  const contacts = useContactOptions(startingOrganization);
  if (!organizations.data || (startingOrganization !== undefined && !contacts.data)) return <FormSkeleton />;
  return <DealFormBody {...props} organizations={organizations.data} />;
}

function DealFormBody({ deal, defaults = {}, onSaved, onDone, organizations }: BodyProps & { organizations: Organization[] }) {
  const toast = useToast();
  const refresh = useRefreshAll();
  const contactsRef = useRef<ContactOption[] | undefined>(undefined);
  const resolver: Resolver<DealValues> = (values, context, options) =>
    zodResolver(dealSchema(contactsRef.current))(values, context, options);

  const stage0 = deal?.stage ?? defaults.stage ?? "new";
  const { register, handleSubmit, setError, setValue, watch, trigger, formState } = useForm<DealValues>({
    resolver,
    mode: "onChange",
    defaultValues: {
      name: deal?.name ?? "",
      organization_id: deal?.organization_id ?? defaults.organizationId,
      contact_id: deal?.contact_id ?? defaults.contactId,
      stage: stage0,
      value_pounds: deal ? deal.value_pence / 100 : undefined,
      probability: deal?.probability ?? defaultProbability(stage0),
      close_date: deal?.close_date ?? "",
    },
  });
  const { errors, isValid, isSubmitting } = formState;

  const organizationId = watch("organization_id");
  const stage = watch("stage") as Stage;
  const contacts = useContactOptions(organizationId);
  contactsRef.current = contacts.data;

  // Revalidate once the organization's contacts arrive, so a mismatch shows.
  useEffect(() => {
    if (contacts.data) void trigger("contact_id");
  }, [contacts.data, trigger]);

  const organizationField = register("organization_id", {
    setValueAs: asNumber,
    onChange: () => setValue("contact_id", undefined as unknown as number, { shouldValidate: true }),
  });
  const stageField = register("stage", {
    onChange: (e) => setValue("probability", defaultProbability(e.target.value as Stage), { shouldValidate: true }),
  });

  const submit = handleSubmit(async (values) => {
    const body = {
      name: values.name,
      organization_id: values.organization_id,
      contact_id: values.contact_id,
      stage: values.stage,
      value_pence: poundsToPence(values.value_pounds),
      probability: values.probability,
      close_date: values.close_date,
    };
    try {
      const saved = deal ? await api.patch<Deal>(`/deals/${deal.id}`, body) : await api.post<Deal>("/deals", body);
      await refresh();
      onDone();
      onSaved?.(saved);
    } catch (error) {
      if (!applyServerErrors(error, setError, { value_pence: "value_pounds" })) toast(error instanceof Error ? error.message : "Couldn't save");
    }
  });

  const fixed = probabilityIsFixed(stage);

  return (
    <form className="form" onSubmit={submit} noValidate>
      <Field label="Name" error={errors.name?.message}>
        <input className="input" autoFocus {...register("name")} />
      </Field>
      <div className="form-row">
        <Field label="Organization" error={errors.organization_id?.message}>
          <select className="select" {...organizationField}>
            <option value="">Choose an organization</option>
            {organizations.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Main contact" error={errors.contact_id?.message} hint={organizationId ? undefined : "Choose an organization first"}>
          <select className="select" disabled={!organizationId} {...register("contact_id", { setValueAs: asNumber })}>
            <option value="">{contacts.data?.length === 0 ? "This organization has no contacts" : "Choose a contact"}</option>
            {contacts.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="form-row">
        <Field label="Stage" error={errors.stage?.message}>
          <select className="select" {...stageField}>
            {STAGES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Value (£)" error={errors.value_pounds?.message}>
          <input className="input mono" type="number" min={0} step="0.01" inputMode="decimal" {...register("value_pounds", { setValueAs: asNumber })} />
        </Field>
      </div>
      <div className="form-row">
        <Field label="Probability (%)" error={errors.probability?.message} hint={fixed ? "Fixed for Won and Lost" : undefined}>
          <input className="input mono" type="number" min={0} max={100} step={1} readOnly={fixed} {...register("probability", { setValueAs: asNumber })} />
        </Field>
        <Field
          label="Close date"
          error={errors.close_date?.message}
          hint={deal && deal.stage !== stage && fixed ? "Moving to Won or Lost sets this to today" : undefined}
        >
          <input className="input mono" type="date" {...register("close_date")} />
        </Field>
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn-quiet" onClick={onDone}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={!isValid || isSubmitting}>
          {deal ? "Save changes" : "Add deal"}
        </button>
      </div>
    </form>
  );
}
