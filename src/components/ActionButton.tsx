import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  loadingText?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

const VARIANTS = {
  primary: "bg-brand-500 hover:bg-brand-600 text-white",
  secondary: "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50",
  ghost: "text-slate-600 hover:bg-slate-100",
  danger: "bg-red-600 hover:bg-red-700 text-white",
};

export function ActionButton({
  loading = false,
  loadingText,
  variant = "primary",
  disabled,
  children,
  className = "",
  ...props
}: Props) {
  const isDisabled = disabled || loading;
  return (
    <button
      type="button"
      disabled={isDisabled}
      className={`inline-flex items-center justify-center font-semibold rounded-lg px-5 py-2 transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {loading ? loadingText ?? "Please wait..." : children}
    </button>
  );
}
