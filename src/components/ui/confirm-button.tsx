"use client";

import { useEffect, useRef, useState } from "react";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/button";

type ConfirmButtonProps = {
  children: React.ReactNode;
  /** Label shown on the second, confirming click. */
  confirmLabel: string;
  onConfirm?: () => void;
  /** Submit the surrounding form on confirmation instead of calling onConfirm. */
  submit?: boolean;
  /** Id of a form to submit on confirmation (for forms that can't be nested). */
  submitForm?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
};

/**
 * Two-step destructive action: the first click arms the button, the second
 * performs the action. Disarms automatically after a few seconds or on blur.
 */
export function ConfirmButton({
  children,
  confirmLabel,
  onConfirm,
  submit = false,
  submitForm,
  variant = "danger-ghost",
  size = "sm",
  loading,
  disabled,
  className,
}: ConfirmButtonProps) {
  const [armed, setArmed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(timer);
  }, [armed]);

  return (
    <div
      ref={containerRef}
      className="inline-flex items-center gap-1"
      onBlur={(event) => {
        if (!containerRef.current?.contains(event.relatedTarget as Node | null)) {
          setArmed(false);
        }
      }}
    >
      {armed ? (
        <>
          <Button type="button" variant="ghost" size={size} onClick={() => setArmed(false)}>
            Cancel
          </Button>
          <Button
            type={submit || submitForm ? "submit" : "button"}
            form={submitForm}
            variant="danger"
            size={size}
            loading={loading}
            disabled={disabled}
            className={className}
            autoFocus
            onClick={() => {
              if (!submit && !submitForm) {
                setArmed(false);
                onConfirm?.();
              }
            }}
          >
            {confirmLabel}
          </Button>
        </>
      ) : (
        <Button
          type="button"
          variant={variant}
          size={size}
          loading={loading}
          disabled={disabled}
          className={className}
          onClick={() => setArmed(true)}
        >
          {children}
        </Button>
      )}
    </div>
  );
}
