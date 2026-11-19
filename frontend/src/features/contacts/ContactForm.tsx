import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Field } from "../../components/Field";
import { Modal } from "../../components/Modal";
import { useToast } from "../../components/Toast";
import { api } from "../../lib/api";
import { applyServerErrors, asNumber } from "../../lib/forms";
import { useOrganizationOptions, useRefreshAll } from "../../lib/queries";
import { STATUSES } from "../../lib/stages";
import type { Contact, Organization } from "../../lib/types";
import { FormSkeleton } from "../../components/Skeleton";
import { contactSchema, type ContactValues } from "./schema";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: Contact;
  /** Pre-filled organization for a new contact. */
  organizationId?: number;
  onSaved?: (contact: Contact) => void;
};

export function ContactForm({ open, onOpenChange, ...rest }: Props) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={rest.contact ? "Edit contact" : "New contact"}>
      {open && <ContactFormLoader {...rest} onDone={() => onOpenChange(false)} />}
    </Modal>
  );
}

type BodyProps = Omit<Props, "open" | "onOpenChange"> & { onDone: () => void };

/** Wait for the organization list, so a pre-filled organization shows as selected. */
function ContactFormLoader(props: BodyProps) {
  const organizations = useOrganizationOptions();
  if (!organizations.data) return <FormSkeleton />;
  return <ContactFormBody {...props} organizations={organizations.data} />;
}

function ContactFormBody({ contact, organizationId, onSaved, onDone, organizations }: BodyProps & { organizations: Organization[] }) {
  const toast = useToast();
  const refresh = useRefreshAll();
  const { register, handleSubmit, setError, formState } = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    mode: "onChange",
    defaultValues: {
      name: contact?.name ?? "",
      email: contact?.email ?? "",
      phone: contact?.phone ?? "",
      job_title: contact?.job_title ?? "",
      organization_id: contact?.organization_id ?? organizationId,
      status: contact?.status ?? "lead",
    },
  });
  const { errors, isValid, isSubmitting } = formState;

  const submit = handleSubmit(async (values) => {
    try {
      const saved = contact
        ? await api.patch<Contact>(`/contacts/${contact.id}`, values)
        : await api.post<Contact>("/contacts", values);
      await refresh();
      onDone();
      onSaved?.(saved);
    } catch (error) {
      if (!applyServerErrors(error, setError)) toast(error instanceof Error ? error.message : "Couldn't save");
    }
  });

  return (
    <form className="form" onSubmit={submit} noValidate>
      <Field label="Name" error={errors.name?.message}>
        <input className="input" autoFocus {...register("name")} />
      </Field>
      <div className="form-row">
        <Field label="Organization" error={errors.organization_id?.message}>
          <select className="select" {...register("organization_id", { setValueAs: asNumber })}>
            <option value="">Choose an organization</option>
            {organizations.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Status" error={errors.status?.message}>
          <select className="select" {...register("status")}>
            {STATUSES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="form-row">
        <Field label="Job title" optional error={errors.job_title?.message}>
          <input className="input" {...register("job_title")} />
        </Field>
        <Field label="Phone" optional error={errors.phone?.message}>
          <input className="input" type="tel" {...register("phone")} />
        </Field>
      </div>
      <Field label="Email" optional error={errors.email?.message}>
        <input className="input" type="email" {...register("email")} />
      </Field>
      <div className="form-actions">
        <button type="button" className="btn btn-quiet" onClick={onDone}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={!isValid || isSubmitting}>
          {contact ? "Save changes" : "Add contact"}
        </button>
      </div>
    </form>
  );
}
