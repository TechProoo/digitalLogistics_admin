import { useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import axios from "axios";
import { useAdminAuth } from "../auth/AdminAuthContext";
import { getApiBaseUrl, getApiErrorMessage } from "../services/apiClient";

export default function Login() {
  const { login } = useAdminAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [capsOn, setCapsOn] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => !!email.trim() && !!password && !loading,
    [email, password, loading],
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password || loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await axios.post(
        `${getApiBaseUrl()}/admin/auth/login`,
        { email: email.trim().toLowerCase(), password },
        { headers: { "Content-Type": "application/json" } },
      );

      // supports either { data: { accessToken } } OR { accessToken }
      const token =
        (res.data as any)?.data?.accessToken ??
        (res.data as any)?.accessToken ??
        (res.data as any)?.token;

      if (!token) throw new Error("No token received from server.");

      login(token);
      navigate("/", { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/40 px-4 flex items-center justify-center">
      <div className="w-full max-w-md">
        {/* Outer frame (black/white border feel) */}
        <div className="rounded-3xl border border-foreground/15 bg-background p-1 shadow-sm">
          {/* Inner card */}
          <div className="rounded-[22px] border bg-card/80 backdrop-blur p-8 sm:p-9">
            {/* Top accent line */}
            <div className="mb-7 h-px w-full bg-foreground/10" />

            {/* Header */}
            <div className="text-center">
              <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl border border-foreground/15 bg-background">
                <ShieldCheck className="h-6 w-6 text-foreground" />
              </div>

              <h1 className="text-2xl font-semibold tracking-tight">
                Admin Portal
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Digital Delivery — restricted access
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-7 space-y-4" noValidate>
              {/* Email */}
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="text-sm font-medium leading-none"
                >
                  Email
                </label>

                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="username"
                    inputMode="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@digitaldelivery.org"
                    disabled={loading}
                    className={[
                      "w-full rounded-xl border bg-background pl-10 pr-4 py-2.5 text-sm",
                      "outline-none ring-offset-background",
                      "focus:ring-2 focus:ring-ring focus:ring-offset-2",
                      "disabled:opacity-60 disabled:cursor-not-allowed",
                      error ? "border-destructive/40" : "border-foreground/15",
                    ].join(" ")}
                  />
                </div>
              </div>

              {/* Password */}
              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="text-sm font-medium leading-none"
                  >
                    Password
                  </label>

                  {capsOn && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-foreground/15 bg-background px-2 py-0.5 text-[11px] text-muted-foreground">
                      <AlertTriangle className="h-3 w-3" />
                      Caps Lock is on
                    </span>
                  )}
                </div>

                {/* ✅ relative wrapper must directly contain both icons and the input */}
                <div className="relative flex items-center">
                  {/* Left lock icon */}
                  <Lock className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" />

                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyUp={(e) => setCapsOn(e.getModifierState("CapsLock"))}
                    onKeyDown={(e) => setCapsOn(e.getModifierState("CapsLock"))}
                    placeholder="••••••••"
                    disabled={loading}
                    className={[
                      "w-full rounded-xl border bg-background pl-10 pr-10 py-2.5 text-sm",
                      "outline-none ring-offset-background",
                      "focus:ring-2 focus:ring-ring focus:ring-offset-2",
                      "disabled:opacity-60 disabled:cursor-not-allowed",
                      error ? "border-destructive/40" : "border-foreground/15",
                    ].join(" ")}
                  />

                  {/* ✅ Right eye toggle — absolute inside the same relative wrapper */}
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    disabled={loading}
                    className="absolute right-7 flex items-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4" />
                    <p>{error}</p>
                  </div>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={!canSubmit}
                className={[
                  "group relative w-full overflow-hidden rounded-xl border border-foreground/15",
                  "bg-foreground text-background",
                  "px-4 py-2.5 text-sm font-semibold",
                  "transition-transform active:scale-[0.99]",
                  "disabled:opacity-60 disabled:cursor-not-allowed",
                ].join(" ")}
              >
                <span className="relative z-10 inline-flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Signing in…
                    </>
                  ) : (
                    "Sign in"
                  )}
                </span>

                {/* subtle hover sheen (keeps b/w vibe) */}
                <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-background/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              </button>
            </form>

            {/* Footer */}
            <div className="mt-7">
              <div className="mb-5 h-px w-full bg-foreground/10" />
              <p className="text-center text-xs text-muted-foreground">
                This portal is for authorised Digital Delivery staff only.
                <br />
                Unauthorised access attempts are logged.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom micro text */}
        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          Tip: Use your official admin email. Tokens expire automatically.
        </p>
      </div>
    </div>
  );
}
