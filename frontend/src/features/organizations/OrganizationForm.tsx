import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Field } from "../../components/Field";
import { Modal } from "../../components/Modal";
import { useToast } from "../../components/Toast";
import { api } from "../../lib/api";
import { applyServerErrors } from "../../lib/forms";
import { useRefreshAll } from "../../lib/queries";
import type { Organization } from "../../lib/types";
import { organizationSchema, type OrganizationValues } from "./schema";

export function OrganizationForm({ open, onOpenChange, organization, onSaved }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organization?: Pick<Organization, "id" | "name" | "website" | "industry" | "notes">;
  onSaved?: (organization: Organization) => void;
}) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={organization ? "Edit organization" : "New organization"}>
      {open && <OrganizationFormBody organization={organization} onDone={() => onOpenChange(false)} onSaved={onSaved} />}
    </Modal>
  );
}

function OrganizationFormBody({ organization, onDone, onSaved }: {
  organization?: Pick<Organization, "id" | "name" | "website" | "industry" | "notes">;
  onDone: () => void;
  onSaved?: (organization: Organization) => void;
}) {
  const toast = useToast();
  const refresh = useRefreshAll();
  const { register, handleSubmit, setError, formState } = useForm<OrganizationValues>({
    resolver: zodResolver(organizationSchema),
    mode: "onChange",
    defaultValues: {
      name: organization?.name ?? "",
      website: organization?.website ?? "",
      industry: organization?.industry ?? "",
      notes: organization?.notes ?? "",
    },
  });
  const { errors, isValid, isSubmitting } = formState;

  const submit = handleSubmit(async (values) => {
    try {
      const saved = organization
        ? await api.patch<Organization>(`/organizations/${organization.id}`, values)
        : await api.post<Organization>("/organizations", values);
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
        <Field label="Industry" optional error={errors.industry?.message}>
          <input className="input" {...register("industry")} />
        </Field>
        <Field label="Website" optional error={errors.website?.message}>
          <input className="input" placeholder="example.co.uk" {...register("website")} />
        </Field>
      </div>
      <Field label="Notes" optional error={errors.notes?.message}>
        <textarea className="textarea" rows={3} {...register("notes")} />
      </Field>
      <div className="form-actions">
        <button type="button" className="btn btn-quiet" onClick={onDone}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={!isValid || isSubmitting}>
          {organization ? "Save changes" : "Add organization"}
        </button>
      </div>
    </form>
  );
}
