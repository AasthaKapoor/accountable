import { useEffect, useState } from "react";
import { Link } from "react-router";
import { BlockedError } from "../lib/api";
import type { Blocked } from "../lib/deleteChecks";
import { Modal } from "./Modal";
import { useToast } from "./Toast";

/**
 * Asks before deleting, says what happens to linked records, and explains
 * a blocked delete (409) with the records that are in the way.
 */
export function ConfirmDelete({ open, onOpenChange, title, name, consequence, check, onConfirm, onDeleted }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  name: string;
  consequence?: string;
  /** Looks for linked records that would block the delete. */
  check?: () => Promise<Blocked | null>;
  onConfirm: () => Promise<unknown>;
  onDeleted?: () => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState<Blocked | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!open || !check) return;
    let current = true;
    setChecking(true);
    check()
      .then((result) => current && setBlocked(result))
      .catch(() => {}) // the delete itself will report any problem
      .finally(() => current && setChecking(false));
    return () => {
      current = false;
    };
    // Run once each time the dialog opens, not when the parent re-renders.
  }, [open]);

  const close = (next: boolean) => {
    if (!next) setBlocked(null);
    onOpenChange(next);
  };

  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
      close(false);
      onDeleted?.();
    } catch (error) {
      if (error instanceof BlockedError) setBlocked({ message: error.message, blocking: error.blocking });
      else toast(error instanceof Error ? error.message : "Couldn't delete");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onOpenChange={close} title={blocked ? `Can't delete ${name}` : title} narrow>
      {blocked ? (
        <>
          <p>{blocked.message}</p>
          {blocked.blocking.length > 0 && (
            <ul className="blocking-list">
              {blocked.blocking.map((b) => (
                <li key={`${b.type}-${b.id}`}>
                  <Link to={`/${b.type}s/${b.id}`} onClick={() => close(false)}>
                    {b.name}
                  </Link>
                  <span className="muted"> ({b.type})</span>
                </li>
              ))}
            </ul>
          )}
          <div className="form-actions">
            <button type="button" className="btn btn-primary" onClick={() => close(false)}>
              OK
            </button>
          </div>
        </>
      ) : (
        <>
          <p>Delete {name}? This can't be undone.</p>
          {consequence && <p className="muted">{consequence}</p>}
          <div className="form-actions">
            <button type="button" className="btn btn-quiet" onClick={() => close(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-danger" onClick={confirm} disabled={busy || checking}>
              {title}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
