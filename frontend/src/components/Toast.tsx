import * as RadixToast from "@radix-ui/react-toast";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Icon } from "./Icon";

interface ToastMessage {
  id: number;
  message: string;
  tone: "error" | "info";
}

const ToastContext = createContext<(message: string, tone?: ToastMessage["tone"]) => void>(() => {});

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const show = useCallback((message: string, tone: ToastMessage["tone"] = "error") => {
    setToasts((current) => [...current, { id: nextId++, message, tone }]);
  }, []);
  const remove = (id: number) => setToasts((current) => current.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={show}>
      <RadixToast.Provider duration={6000} swipeDirection="right">
        {children}
        {toasts.map((toast) => (
          <RadixToast.Root
            key={toast.id}
            className={`toast ${toast.tone}`}
            onOpenChange={(open) => !open && remove(toast.id)}
            type={toast.tone === "error" ? "foreground" : "background"}
          >
            <RadixToast.Title className="toast-title">{toast.message}</RadixToast.Title>
            <RadixToast.Close className="icon-btn" aria-label="Dismiss">
              <Icon name="close" />
            </RadixToast.Close>
          </RadixToast.Root>
        ))}
        <RadixToast.Viewport className="toast-viewport" />
      </RadixToast.Provider>
    </ToastContext.Provider>
  );
}

/** Show a toast: `toast("Couldn't save")`. Errors are the default. */
export function useToast() {
  return useContext(ToastContext);
}
