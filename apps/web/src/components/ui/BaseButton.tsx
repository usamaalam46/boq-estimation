
import type {
  ButtonHTMLAttributes,
  ReactNode,
} from "react";
import "./BaseButton.css";

export interface BaseButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export default function BaseButton({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  disabled,
  className = "",
  type = "button",
  ...buttonProps
}: BaseButtonProps) {
  const classes = [
    "base-button",
    `base-button-${variant}`,
    `base-button-${size}`,
    fullWidth ? "base-button-full-width" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      {...buttonProps}
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading && <span className="base-button-spinner" aria-hidden="true" />}
      {!loading && leftIcon && (
        <span className="base-button-icon">{leftIcon}</span>
      )}

      <span>{loading ? "Please wait..." : children}</span>

      {!loading && rightIcon && (
        <span className="base-button-icon">{rightIcon}</span>
      )}
    </button>
  );
}
