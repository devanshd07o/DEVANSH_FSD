import React from "react";

export function Button({ children, className = "", variant = "primary", size = "md", isLoading = false, disabled, ...props }) {
  const variants = {
    primary: "bg-accent text-white hover:bg-accent-hover border border-accent",
    secondary: "bg-surface-subtle text-text-primary hover:bg-zinc-200 border border-border",
    outline: "bg-surface text-text-primary hover:bg-surface-subtle border border-border-strong",
    danger: "bg-danger text-white hover:bg-red-800 border border-danger",
  };
  const sizes = {
    sm: "min-h-[36px] px-3 py-1.5 text-xs",
    md: "min-h-[44px] px-4 py-2 text-sm",
    lg: "min-h-[44px] px-5 py-2.5 text-sm",
  };
  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center font-medium rounded-control select-none disabled:opacity-50 disabled:cursor-not-allowed transition-standard ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {isLoading ? "Please wait..." : children}
    </button>
  );
}

export function Badge({ children, variant = "neutral", className = "" }) {
  const variants = {
    neutral: "bg-surface-subtle text-text-secondary border-border",
    success: "bg-success-bg text-success border-emerald-200",
    warning: "bg-warning-bg text-warning border-amber-200",
    danger: "bg-danger-bg text-danger border-rose-200",
    info: "bg-info-bg text-info border-blue-200",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-control border tabular-nums whitespace-nowrap ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}

export function Alert({ type = "error", children }) {
  if (!children) return null;
  const styles =
    type === "success"
      ? "bg-success-bg border-emerald-200 text-success"
      : type === "warning"
      ? "bg-warning-bg border-amber-200 text-warning"
      : "bg-danger-bg border-rose-200 text-danger";
  return (
    <div role="alert" className={`p-3 rounded-control border text-xs sm:text-sm ${styles}`}>
      {children}
    </div>
  );
}

export function Field({ label, id, className = "", ...props }) {
  return (
    <div>
      {label && (
        <label htmlFor={id} className="block text-xs font-semibold text-text-primary mb-1.5">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`w-full px-3 py-2.5 text-base sm:text-sm bg-surface rounded-control border border-border focus:border-accent outline-none ${className}`}
        {...props}
      />
    </div>
  );
}

export function SelectField({ label, id, children, className = "", ...props }) {
  return (
    <div>
      {label && (
        <label htmlFor={id} className="block text-xs font-semibold text-text-primary mb-1.5">
          {label}
        </label>
      )}
      <select
        id={id}
        className={`w-full px-3 py-2.5 text-base sm:text-sm bg-surface rounded-control border border-border focus:border-accent outline-none ${className}`}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}
