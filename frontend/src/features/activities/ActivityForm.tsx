import { zodResolver } from "@hookform/resolvers/zod";
import { format, parseISO } from "date-fns";
import { useForm } from "react-hook-form";
import { Field } from "../../components/Field";
import { useToast } from "../../components/Toast";
import { applyServerErrors } from "../../lib/forms";
import type { Activity } from "../../lib/types";
import { activitySchema, type ActivityValues } from "./schema";

const toLocalInput = (date: Date) => format(date, "yyyy-MM-dd'T'HH:mm");

export function emptyActivity(): ActivityValues {
  return { type: "note", description: "", occurred_at: toLocalInput(new Date()), follow_up_date: "" };
}

export function activityValues(activity: Activity): ActivityValues {
  return {
    type: activity.type as ActivityValues["type"],
    description: activity.description,
    occurred_at: toLocalInput(parseISO(activity.occurred_at)),
    follow_up_date: activity.follow_up_date ?? "",
  };
}

/** The values as the API expects them: the local date and time sent as UTC. */
export function activityBody(values: ActivityValues) {
  return {
    type: values.type,
    description: values.description,
    occurred_at: new Date(values.occurred_at).toISOString(),
    follow_up_date: values.follow_up_date || null,
  };
}

export function ActivityForm({ initial, submitLabel, onSubmit, onCancel, compact }: {
  initial: ActivityValues;
  submitLabel: string;
  onSubmit: (values: ActivityValues) => Promise<void>;
  onCancel?: () => void;
  compact?: boolean;
}) {
  const toast = useToast();
  const { register, handleSubmit, setError, reset, formState } = useForm<ActivityValues>({
    resolver: zodResolver(activitySchema),
    mode: "onChange",
    defaultValues: initial,
  });
  const { errors, isValid, isSubmitting } = formState;

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(values);
      if (compact) reset(emptyActivity());
    } catch (error) {
      if (!applyServerErrors(error, setError)) toast(error instanceof Error ? error.message : "Couldn't save");
    }
  });

  return (
    <form className={`form${compact ? " log-form" : ""}`} onSubmit={submit} noValidate aria-label={submitLabel}>
      <div className="form-row" style={{ gridTemplateColumns: "140px 1fr" }}>
        <Field label="Type" error={errors.type?.message}>
          <select className="select" {...register("type")}>
            <option value="note">Note</option>
            <option value="call">Call</option>
            <option value="email">Email</option>
          </select>
        </Field>
        <Field label="Description" error={errors.description?.message}>
          <input className="input" placeholder="What happened, or what needs doing" {...register("description")} />
        </Field>
      </div>
      <div className="form-row" style={{ gridTemplateColumns: "1fr 1fr auto", alignItems: "end" }}>
        <Field label="When" error={errors.occurred_at?.message}>
          <input className="input mono" type="datetime-local" {...register("occurred_at")} />
        </Field>
        <Field label="Follow-up date" optional error={errors.follow_up_date?.message}>
          <input className="input mono" type="date" {...register("follow_up_date")} />
        </Field>
        <div className="form-actions" style={{ marginTop: 0 }}>
          {onCancel && (
            <button type="button" className="btn btn-quiet" onClick={onCancel}>
              Cancel
            </button>
          )}
          <button type="submit" className="btn btn-primary" disabled={!isValid || isSubmitting} style={{ height: 38 }}>
            {submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}
