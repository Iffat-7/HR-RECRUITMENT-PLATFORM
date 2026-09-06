import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "../../lib/utils";

/* Form primitives — uncontrolled-friendly (work with react-hook-form register). */

export function Field({
  label,
  error,
  hint,
  required,
  children,
  className,
}: {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      {label && (
        <span className="mb-1.5 flex items-baseline justify-between text-[13px] font-semibold text-ink-700">
          <span>
            {label}
            {required && <span className="ml-0.5 text-danger-600">*</span>}
          </span>
          {hint && <span className="text-[11px] font-normal text-ink-400">{hint}</span>}
        </span>
      )}
      {children}
      {error && (
        <span role="alert" className="mt-1.5 block text-xs font-medium text-danger-600">
          {error}
        </span>
      )}
    </label>
  );
}

const baseField =
  "w-full rounded-lg border bg-white px-3 text-sm text-ink-900 placeholder:text-ink-300 transition-colors duration-150 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-ink-900/4";

const stateCls = (error?: boolean) =>
  error
    ? "border-danger-600/60 focus:border-danger-600 focus:ring-danger-600/15"
    : "border-line-strong focus:border-primary-500 focus:ring-primary-500/15";

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { invalid, className, ...rest },
  ref
) {
  return (
    <input
      ref={ref}
      className={cn(baseField, "h-10", stateCls(invalid), className)}
      {...rest}
    />
  );
});

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { invalid, className, ...rest },
  ref
) {
  return (
    <textarea
      ref={ref}
      className={cn(baseField, "min-h-24 py-2 leading-relaxed", stateCls(invalid), className)}
      {...rest}
    />
  );
});

export interface SelectInputProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export const SelectInput = forwardRef<HTMLSelectElement, SelectInputProps>(function SelectInput(
  { invalid, className, children, ...rest },
  ref
) {
  return (
    <select
      ref={ref}
      className={cn(baseField, "h-10 appearance-none pr-8", stateCls(invalid), className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2354688a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 10px center",
      }}
      {...rest}
    >
      {children}
    </select>
  );
});

export const CheckboxInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }
>(function CheckboxInput({ invalid, className, ...rest }, ref) {
  return (
    <input
      ref={ref}
      type="checkbox"
      className={cn(
        "h-4 w-4 shrink-0 cursor-pointer rounded border-line-strong accent-primary-600",
        invalid && "accent-danger-600",
        className
      )}
      {...rest}
    />
  );
});

export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5.5 w-10 items-center rounded-full transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600",
        checked ? "bg-success-600" : "bg-ink-300",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200",
          checked ? "translate-x-5" : "translate-x-1"
        )}
      />
    </button>
  );
}
