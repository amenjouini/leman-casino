"use client";

import { startTransition, useActionState, useEffect, useRef, type FormEvent } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { ActionState } from "@/lib/admin/action";

type Action = (prev: ActionState, fd: FormData) => Promise<ActionState>;

/**
 * Runs a server action from onSubmit (instead of the `action` prop) so React does
 * not reset the form fields: the owner keeps their input when validation fails.
 */
export function useFormAction(action: Action, opts: { confirm?: (submitter: HTMLElement | null) => string | undefined } = {}) {
  const [state, dispatch, pending] = useActionState(action, { ok: false });
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    const question = opts.confirm?.(submitter);
    if (question && !window.confirm(question)) return;
    const fd = new FormData(e.currentTarget, submitter as HTMLButtonElement | null);
    startTransition(() => dispatch(fd));
  };
  return [state, onSubmit, pending] as const;
}

export function SubmitButton({
  children,
  className = "btn btn-gold btn-sm",
  pendingLabel,
  disabled,
  pending = false,
}: {
  children: React.ReactNode;
  className?: string;
  pendingLabel?: string;
  disabled?: boolean;
  pending?: boolean;
}) {
  return (
    <button type="submit" className={className} disabled={pending || disabled} aria-busy={pending}>
      {pending ? (
        <>
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
          {pendingLabel ?? children}
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function FormMessage({ state, className = "" }: { state: ActionState; className?: string }) {
  if (!state.at) return null;
  if (state.ok)
    return (
      <p role="status" className={`flex items-start gap-2 text-sm text-ok ${className}`}>
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {state.message}
      </p>
    );
  return (
    <p role="alert" className={`flex items-start gap-2 text-sm text-danger ${className}`}>
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {state.error}
    </p>
  );
}

/** A server-action form with pending state, inline result message and optional confirmation. */
export function ActionForm({
  action,
  hidden = {},
  children,
  label,
  buttonClass,
  confirm,
  className = "",
  messageClass = "",
  resetOnSuccess = false,
  onSuccess,
}: {
  action: Action;
  hidden?: Record<string, string>;
  children?: React.ReactNode;
  label?: React.ReactNode;
  buttonClass?: string;
  confirm?: string;
  className?: string;
  messageClass?: string;
  resetOnSuccess?: boolean;
  onSuccess?: (state: ActionState) => void;
}) {
  const [state, onSubmit, pending] = useFormAction(action, { confirm: () => confirm });
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok && state.at) {
      if (resetOnSuccess) formRef.current?.reset();
      onSuccess?.(state);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.at]);

  return (
    <form ref={formRef} onSubmit={onSubmit} className={className}>
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      {children}
      {label && (
        <SubmitButton className={buttonClass} pending={pending}>
          {label}
        </SubmitButton>
      )}
      <FormMessage state={state} className={messageClass || "mt-2"} />
    </form>
  );
}
