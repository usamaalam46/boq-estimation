
import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import "./BaseInput.css";

export interface BaseInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  error?: string;
  hint?: string;
  size?: "sm" | "md" | "lg";
  leftElement?: ReactNode;
  rightElement?: ReactNode;
  containerClassName?: string;
}

const BaseInput = forwardRef<HTMLInputElement, BaseInputProps>(
  (
    {
      label,
      error,
      hint,
      size = "md",
      leftElement,
      rightElement,
      containerClassName = "",
      className = "",
      id,
      disabled,
      ...inputProps
    },
    ref,
  ) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;

    const describedBy = [
      inputProps["aria-describedby"],
      error ? errorId : hint ? hintId : undefined,
    ]
      .filter(Boolean)
      .join(" ") || undefined;

    return (
      <div className={`base-input-group ${containerClassName}`}>
        {label && (
          <label className="base-input-label" htmlFor={inputId}>
            {label}
            {inputProps.required && (
              <span className="base-input-required"> *</span>
            )}
          </label>
        )}

        <div
          className={[
            "base-input-control",
            `base-input-${size}`,
            error ? "has-error" : "",
            disabled ? "is-disabled" : "",
            leftElement ? "has-left-element" : "",
            rightElement ? "has-right-element" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {leftElement && (
            <span className="base-input-element base-input-left">
              {leftElement}
            </span>
          )}

          <input
            {...inputProps}
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={`base-input-field ${className}`}
            aria-invalid={error ? true : inputProps["aria-invalid"]}
            aria-describedby={describedBy}
          />

          {rightElement && (
            <span className="base-input-element base-input-right">
              {rightElement}
            </span>
          )}
        </div>

        {error && (
          <p className="base-input-error" id={errorId} role="alert">
            {error}
          </p>
        )}

        {!error && hint && (
          <p className="base-input-hint" id={hintId}>
            {hint}
          </p>
        )}
      </div>
    );
  },
);

BaseInput.displayName = "BaseInput";

export default BaseInput;
