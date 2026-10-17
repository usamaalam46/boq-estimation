
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { isAxiosError } from "axios";

import authService from "../../services/auth.service";
import BaseInput from "../../components/ui/BaseInput";
import BaseButton from "../../components/ui/BaseButton";

import "./Login.css";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isLoading) return;

    setError("");

    const normalizedEmail = email.trim();

    if (!normalizedEmail || !password) {
      setError("Please enter your email address and password.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await authService.login({
        email: normalizedEmail,
        password,
      });

      if (!response.token) {
        setError("Login failed. The server did not return an access token.");
        return;
      }

      localStorage.setItem("boq_access_token", response.token);

      navigate("/dashboard", { replace: true });
    } catch (err: unknown) {
      if (isAxiosError<{ message?: string }>(err)) {
        const status = err.response?.status;
        const message = err.response?.data?.message;

        if (status === 401) {
          setError("Invalid email address or password.");
        } else if (status === 403) {
          setError(message || "You do not have permission to sign in.");
        } else if (status === 422) {
          setError(message || "Please check your login details.");
        } else if (!err.response) {
          setError("Unable to connect to the server. Please try again.");
        } else {
          setError(message || "Login failed. Please try again.");
        }
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="boq-login-page">
      {/* Branding panel */}
      <section
        className="boq-login-brand-panel"
        aria-label="BOQ Estimation introduction"
      >
        <div className="boq-brand-content">
          <a className="boq-brand-logo" href="/login" aria-label="BOQ Estimation">
            <span className="boq-brand-logo-icon" aria-hidden="true">
              <svg
                width="30"
                height="30"
                viewBox="0 0 30 30"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M5 9.5L15 4L25 9.5V20.5L15 26L5 20.5V9.5Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <path
                  d="M5.5 9.5L15 15L24.5 9.5M15 15V25.5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </svg>
            </span>

            <span className="boq-brand-logo-text">
              <strong>BOQ</strong>
              <span>ESTIMATION</span>
            </span>
          </a>

          <div className="boq-brand-message">
            <span className="boq-brand-eyebrow">ESTIMATE SMARTER</span>

            <h1>
              Build with
              <br />
              confidence.
            </h1>

            <p>
              Simplify your quantity estimation, manage project costs, and
              bring every detail of your BOQ into one organized workspace.
            </p>
          </div>

          <div className="boq-brand-features">
            <div className="boq-brand-feature">
              <span className="boq-feature-icon" aria-hidden="true">
                ✓
              </span>
              <div>
                <strong>Accurate estimates</strong>
                <span>Keep quantities and costs organized.</span>
              </div>
            </div>

            <div className="boq-brand-feature">
              <span className="boq-feature-icon" aria-hidden="true">
                ✓
              </span>
              <div>
                <strong>One organized workspace</strong>
                <span>Keep your projects and estimates together.</span>
              </div>
            </div>
          </div>
        </div>

        <div className="boq-brand-footer">
          <span>BOQ Estimation</span>
          <span>Plan better. Build smarter.</span>
        </div>
      </section>

      {/* Login panel */}
      <section className="boq-login-form-panel">
        <div className="boq-login-card">
          <div className="boq-login-mobile-logo">
            <span className="boq-brand-logo-icon" aria-hidden="true">
              <svg
                width="28"
                height="28"
                viewBox="0 0 30 30"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M5 9.5L15 4L25 9.5V20.5L15 26L5 20.5V9.5Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <path
                  d="M5.5 9.5L15 15L24.5 9.5M15 15V25.5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </svg>
            </span>

            <span className="boq-brand-logo-text">
              <strong>BOQ</strong>
              <span>ESTIMATION</span>
            </span>
          </div>

          <div className="boq-login-heading">
            <span className="boq-login-eyebrow">ADMIN PORTAL</span>
            <h2>Welcome back</h2>
            <p>Sign in to access your BOQ estimation workspace.</p>
          </div>

          <form
            className="boq-login-form"
            onSubmit={handleSubmit}
            noValidate
          >
            <div className="boq-form-group">
              <BaseInput
                id="admin-email"
                name="email"
                type="email"
                label="Email address"
                placeholder="admin@example.com"
                autoComplete="username"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError("");
                }}
                required
                disabled={isLoading}
                aria-describedby={error ? "login-error" : undefined}
              />
            </div>

            <div className="boq-form-group">
              <div className="boq-password-label">
                <label htmlFor="admin-password">Password</label>

                <BaseButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="boq-text-button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  disabled={isLoading}
                >
                  {showPassword ? "Hide" : "Show"}
                </BaseButton>
              </div>

              <BaseInput
                id="admin-password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError("");
                }}
                required
                disabled={isLoading}
                aria-describedby={error ? "login-error" : undefined}
              />
            </div>

            {error && (
              <div
                id="login-error"
                className="boq-login-message boq-login-error"
                role="alert"
              >
                <span aria-hidden="true">!</span>
                <p>{error}</p>
              </div>
            )}

            <BaseButton
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              className="boq-sign-in-button"
              disabled={isLoading}
              rightIcon={
                isLoading ? undefined : (
                  <span aria-hidden="true" className="boq-submit-arrow">
                    →
                  </span>
                )
              }
            >
              {isLoading ? "Signing in..." : "Sign in to dashboard"}
            </BaseButton>
          </form>

          <div className="boq-login-security-note">
            <span aria-hidden="true">🔒</span>
            <span>Your workspace is protected and secure.</span>
          </div>

          <footer className="boq-login-footer">
            <span>© {new Date().getFullYear()} BOQ Estimation</span>
            <span className="boq-footer-separator" aria-hidden="true">
              ·
            </span>
            <span>All rights reserved</span>
          </footer>
        </div>
      </section>
    </main>
  );
}
