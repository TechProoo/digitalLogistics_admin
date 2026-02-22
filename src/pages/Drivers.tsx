import React, { useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "../components/sidebar";
import { driversApi } from "../services/driversApi";
import { getApiBaseUrl, getApiErrorMessage } from "../services/apiClient";
import type {
  DriverApplication,
  DriverApplicationStatus,
  VehicleType,
} from "../types/driver";
import {
  DRIVER_APPLICATION_STATUS_LABELS,
  VEHICLE_TYPE_LABELS,
} from "../types/driver";
import {
  AlertTriangle,
  Ban,
  Bike,
  Car,
  CheckCircle2,
  ChevronRight,
  FileText,
  RefreshCcw,
  Search,
  User,
  Users,
  Video,
  X,
} from "lucide-react";

function cn(...classes: Array<string | boolean | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatTimestamp(ts: string) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSla(createdAt: string) {
  const created = new Date(createdAt).getTime();
  if (!Number.isFinite(created)) return "";

  const deadline = created + 48 * 60 * 60 * 1000;
  const diff = deadline - Date.now();

  if (diff <= 0) return "SLA breached";

  const totalMinutes = Math.floor(diff / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m left`;
}

function buildFileUrl(path: string): string {
  const base = getApiBaseUrl().replace(/\/$/, "");
  const p = String(path || "").replace(/^\//, "");
  return `${base}/${p}`;
}

function vehicleIcon(type: VehicleType) {
  return type === "VAN" ? Car : Bike;
}

type Tone = "teal" | "slate" | "amber" | "green" | "red";

function toneStyle(tone: Tone): React.CSSProperties {
  if (tone === "teal")
    return {
      backgroundColor: "rgba(46, 196, 182, 0.12)",
      border: "1px solid rgba(46, 196, 182, 0.30)",
      color: "var(--accent-teal)",
    };
  if (tone === "amber")
    return {
      backgroundColor: "rgba(245, 158, 11, 0.12)",
      border: "1px solid rgba(245, 158, 11, 0.30)",
      color: "#f59e0b",
    };
  if (tone === "green")
    return {
      backgroundColor: "rgba(34, 197, 94, 0.12)",
      border: "1px solid rgba(34, 197, 94, 0.30)",
      color: "var(--status-success)",
    };
  if (tone === "red")
    return {
      backgroundColor: "rgba(239, 68, 68, 0.12)",
      border: "1px solid rgba(239, 68, 68, 0.30)",
      color: "#ef4444",
    };
  return {
    backgroundColor: "rgba(100, 116, 139, 0.12)",
    border: "1px solid rgba(100, 116, 139, 0.25)",
    color: "var(--text-secondary)",
  };
}

function Pill({ label, tone }: { label: string; tone: Tone }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
      style={toneStyle(tone)}
    >
      {label}
    </span>
  );
}

function applicationTone(status?: DriverApplicationStatus): Tone {
  if (status === "PENDING") return "amber";
  if (status === "NEEDS_INFO") return "red";
  if (status === "APPROVED") return "green";
  if (status === "REJECTED") return "slate";
  return "slate";
}

function Button({
  children,
  onClick,
  disabled,
  variant = "secondary",
  leftIcon,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
  leftIcon?: React.ReactNode;
}) {
  const styles: Record<string, React.CSSProperties> = {
    primary: {
      backgroundColor: "rgba(34, 197, 94, 0.12)",
      borderColor: "rgba(34, 197, 94, 0.30)",
      color: "var(--status-success)",
    },
    secondary: {
      backgroundColor: "var(--bg-secondary)",
      borderColor: "var(--border-medium)",
      color: "var(--text-primary)",
    },
    danger: {
      backgroundColor: "rgba(239, 68, 68, 0.12)",
      borderColor: "rgba(239, 68, 68, 0.30)",
      color: "#ef4444",
    },
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition active:scale-[0.99]",
        disabled && "opacity-60 cursor-not-allowed",
      )}
      style={styles[variant]}
    >
      {leftIcon ? <span className="shrink-0">{leftIcon}</span> : null}
      <span className="truncate">{children}</span>
    </button>
  );
}

function Segmented({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string; count?: number }>;
}) {
  return (
    <div
      className="inline-flex rounded-xl border p-1"
      style={{
        backgroundColor: "var(--bg-secondary)",
        borderColor: "var(--border-medium)",
      }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition",
              active ? "shadow-sm" : "opacity-80 hover:opacity-100",
            )}
            style={{
              backgroundColor: active ? "var(--bg-tertiary)" : "transparent",
              color: active ? "var(--text-primary)" : "var(--text-secondary)",
              border: active
                ? "1px solid var(--border-medium)"
                : "1px solid transparent",
            }}
          >
            {opt.label}
            {typeof opt.count === "number" ? (
              <span
                className="ml-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold"
                style={{
                  backgroundColor: "rgba(100,116,139,0.12)",
                  color: "var(--text-secondary)",
                }}
              >
                {opt.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function SkeletonRow({ cols = 7 }: { cols?: number }) {
  return (
    <tr className="border-t" style={{ borderColor: "var(--border-medium)" }}>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-5 py-4">
          <div
            className="h-4 w-full max-w-[220px] rounded-md animate-pulse"
            style={{ backgroundColor: "var(--bg-tertiary)" }}
          />
          {i === 0 ? (
            <div
              className="mt-2 h-3 w-40 rounded-md animate-pulse"
              style={{ backgroundColor: "var(--bg-tertiary)" }}
            />
          ) : null}
        </td>
      ))}
    </tr>
  );
}

function ApplicationModal({
  app,
  onClose,
  onUpdated,
}: {
  app: DriverApplication;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const Icon = vehicleIcon(app.vehicleType);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  // Better modal UX: lock scroll + ESC close + focus
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtnRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const updateStatus = async (status: DriverApplicationStatus) => {
    if (isWorking) return;
    setIsWorking(true);
    setError(null);
    try {
      await driversApi.updateApplicationStatus(app.id, status);
      onClose();
      onUpdated();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsWorking(false);
    }
  };

  const DocCard = ({
    label,
    path,
    kind,
  }: {
    label: string;
    path: string;
    kind: "doc" | "video";
  }) => {
    const missing = !path;
    const url = missing ? "" : buildFileUrl(path);
    const Ico = kind === "video" ? Video : FileText;

    return (
      <a
        href={missing ? undefined : url}
        target={missing ? undefined : "_blank"}
        rel={missing ? undefined : "noreferrer"}
        onClick={(e) => {
          if (missing) e.preventDefault();
        }}
        className={cn(
          "group flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition",
          missing ? "opacity-70 cursor-not-allowed" : "hover:opacity-95",
        )}
        style={{
          backgroundColor: "var(--bg-secondary)",
          borderColor: "var(--border-medium)",
          color: "var(--text-primary)",
        }}
        aria-disabled={missing}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
            style={{
              backgroundColor: missing
                ? "rgba(100,116,139,0.12)"
                : "rgba(46, 196, 182, 0.12)",
            }}
          >
            <Ico
              className="h-5 w-5"
              style={{
                color: missing ? "var(--text-secondary)" : "var(--accent-teal)",
              }}
            />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{label}</div>
            <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
              {missing ? "Missing file" : "Open file"}
            </div>
          </div>
        </div>

        {missing ? (
          <span
            className="text-xs inline-flex items-center gap-1"
            style={{ color: "var(--text-secondary)" }}
          >
            <AlertTriangle className="h-4 w-4" /> Missing
          </span>
        ) : (
          <span
            className="text-xs inline-flex items-center gap-1"
            style={{ color: "var(--text-secondary)" }}
          >
            View{" "}
            <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </span>
        )}
      </a>
    );
  };

  const sla = formatSla(app.createdAt);
  const slaTone: Tone = sla === "SLA breached" ? "red" : "slate";

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0"
        style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
        onClick={onClose}
      />

      <div className="absolute inset-0 flex items-start justify-center p-4 sm:p-8 overflow-auto">
        <div
          className="w-full max-w-4xl rounded-2xl border shadow-xl"
          style={{
            backgroundColor: "var(--bg-primary)",
            borderColor: "var(--border-medium)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-start justify-between gap-4 px-6 py-5 border-b sticky top-0 z-10"
            style={{
              borderColor: "var(--border-medium)",
              backgroundColor: "var(--bg-primary)",
            }}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div
                  className="h-11 w-11 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: "rgba(46, 196, 182, 0.12)" }}
                >
                  <Icon
                    className="h-5 w-5"
                    style={{ color: "var(--accent-teal)" }}
                  />
                </div>

                <div className="min-w-0">
                  <div
                    className="text-lg font-bold header truncate"
                    style={{ color: "var(--text-primary)" }}
                    title={app.driverName}
                  >
                    {app.driverName}
                  </div>
                  <div
                    className="text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {VEHICLE_TYPE_LABELS[app.vehicleType]} · {app.plateNumber} ·{" "}
                    {formatTimestamp(app.createdAt)}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Pill
                      label={
                        app.applicationStatus
                          ? DRIVER_APPLICATION_STATUS_LABELS[
                              app.applicationStatus
                            ]
                          : "Application"
                      }
                      tone={applicationTone(app.applicationStatus)}
                    />
                    <Pill label={sla} tone={slaTone} />
                  </div>
                </div>
              </div>
            </div>

            <button
              ref={closeBtnRef}
              onClick={onClose}
              className="p-2 rounded-xl border transition hover:opacity-90"
              aria-label="Close"
              style={{
                backgroundColor: "var(--bg-secondary)",
                borderColor: "var(--border-medium)",
                color: "var(--text-primary)",
              }}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="px-6 py-6 space-y-6">
            {error ? (
              <div
                className="rounded-xl border px-4 py-3 text-sm"
                style={{
                  backgroundColor: "rgba(239, 68, 68, 0.10)",
                  borderColor: "rgba(239, 68, 68, 0.30)",
                  color: "#ef4444",
                }}
              >
                {error}
              </div>
            ) : null}

            {/* Actions */}
            <div
              className="rounded-2xl border p-4 sm:p-5"
              style={{
                backgroundColor: "var(--bg-secondary)",
                borderColor: "var(--border-medium)",
              }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div
                    className="text-sm font-bold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Review actions
                  </div>
                  <div
                    className="text-xs mt-1"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Approve, request more info, or reject this submission.
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    disabled={isWorking}
                    onClick={() => updateStatus("APPROVED")}
                    variant="primary"
                    leftIcon={<CheckCircle2 className="h-4 w-4" />}
                  >
                    {isWorking ? "Updating..." : "Approve"}
                  </Button>

                  <Button
                    disabled={isWorking}
                    onClick={() => updateStatus("NEEDS_INFO")}
                    variant="danger"
                    leftIcon={<AlertTriangle className="h-4 w-4" />}
                  >
                    Needs info
                  </Button>

                  <Button
                    disabled={isWorking}
                    onClick={() => updateStatus("REJECTED")}
                    variant="secondary"
                    leftIcon={<Ban className="h-4 w-4" />}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            </div>

            {/* Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  title: "Vehicle",
                  value: VEHICLE_TYPE_LABELS[app.vehicleType],
                  extra: (
                    <Pill
                      label={VEHICLE_TYPE_LABELS[app.vehicleType]}
                      tone="teal"
                    />
                  ),
                },
                { title: "Plate", value: app.plateNumber },
                {
                  title: "Guarantor",
                  value: app.guarantorName,
                  sub: app.guarantorPhone,
                },
              ].map((c) => (
                <div
                  key={c.title}
                  className="rounded-xl border p-4"
                  style={{
                    backgroundColor: "var(--bg-secondary)",
                    borderColor: "var(--border-medium)",
                  }}
                >
                  <div
                    className="text-xs font-semibold header"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {c.title}
                  </div>
                  <div className="mt-2">
                    {c.extra ? (
                      c.extra
                    ) : (
                      <div
                        className="text-sm font-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {c.value}
                      </div>
                    )}
                    {c.sub ? (
                      <div
                        className="text-xs mt-1"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {c.sub}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            {/* Driver */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <User
                  className="h-5 w-5"
                  style={{ color: "var(--accent-teal)" }}
                />
                <div
                  className="text-base font-bold header"
                  style={{ color: "var(--text-primary)" }}
                >
                  Driver
                </div>
              </div>

              <div
                className="rounded-xl border p-5"
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  borderColor: "var(--border-medium)",
                }}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div
                      className="text-xs font-semibold header"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Name
                    </div>
                    <div
                      className="text-sm font-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {app.driverName}
                    </div>
                  </div>
                  <div>
                    <div
                      className="text-xs font-semibold header"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Address
                    </div>
                    <div
                      className="text-sm"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {app.driverAddress}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Guarantor */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Users
                  className="h-5 w-5"
                  style={{ color: "var(--accent-teal)" }}
                />
                <div
                  className="text-base font-bold header"
                  style={{ color: "var(--text-primary)" }}
                >
                  Guarantor
                </div>
              </div>

              <div
                className="rounded-xl border p-5"
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  borderColor: "var(--border-medium)",
                }}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div
                      className="text-xs font-semibold header"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Name
                    </div>
                    <div
                      className="text-sm font-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {app.guarantorName}
                    </div>
                  </div>
                  <div>
                    <div
                      className="text-xs font-semibold header"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Phone
                    </div>
                    <div
                      className="text-sm"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {app.guarantorPhone}
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <div
                      className="text-xs font-semibold header"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Address
                    </div>
                    <div
                      className="text-sm"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {app.guarantorAddress}
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <div
                      className="text-xs font-semibold header"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      NIN
                    </div>
                    <div
                      className="text-sm"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {app.guarantorNin}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Files */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <FileText
                  className="h-5 w-5"
                  style={{ color: "var(--accent-teal)" }}
                />
                <div
                  className="text-base font-bold header"
                  style={{ color: "var(--text-primary)" }}
                >
                  Uploaded Files
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <DocCard
                  label="Proof of ownership"
                  path={app.proofOfOwnershipPath}
                  kind="doc"
                />
                <DocCard
                  label="Vehicle license"
                  path={app.vehicleLicensePath}
                  kind="doc"
                />
                <DocCard
                  label="Hackney permit"
                  path={app.hackneyPermitPath}
                  kind="doc"
                />
                <DocCard
                  label="Vehicle insurance"
                  path={app.vehicleInsurancePath}
                  kind="doc"
                />
                <DocCard
                  label="Vehicle video"
                  path={app.vehicleVideoPath}
                  kind="video"
                />
                <DocCard
                  label="Driver's license"
                  path={app.driversLicensePath}
                  kind="doc"
                />
                <DocCard
                  label="Means of ID"
                  path={app.meansOfIdPath}
                  kind="doc"
                />
                <DocCard
                  label="Driver face photo"
                  path={app.driverFacePhotoPath}
                  kind="doc"
                />
                <DocCard
                  label="Driver full body photo"
                  path={app.driverFullBodyPhotoPath}
                  kind="doc"
                />
                <DocCard
                  label="Guarantor ID"
                  path={app.guarantorMeansOfIdPath}
                  kind="doc"
                />
              </div>

              <div
                className="mt-4 text-xs"
                style={{ color: "var(--text-secondary)" }}
              >
                Tip: Files open in a new tab.
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Drivers() {
  const [apps, setApps] = useState<DriverApplication[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selected, setSelected] = useState<DriverApplication | null>(null);

  const [status, setStatus] = useState<DriverApplicationStatus>("PENDING");
  const [vehicleType, setVehicleType] = useState<"ALL" | VehicleType>("ALL");

  // Debounced search (smoother on big lists)
  useEffect(() => {
    const t = window.setTimeout(
      () => setDebouncedQuery(searchQuery.trim()),
      180,
    );
    return () => window.clearTimeout(t);
  }, [searchQuery]);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await driversApi.listApplications({
        status,
        vehicleType: vehicleType === "ALL" ? undefined : vehicleType,
      });
      setApps(data);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, vehicleType]);

  const filtered = useMemo(() => {
    const q = debouncedQuery.toLowerCase();
    if (!q) return apps;
    return apps.filter((a) => {
      return (
        a.driverName.toLowerCase().includes(q) ||
        a.plateNumber.toLowerCase().includes(q) ||
        a.guarantorName.toLowerCase().includes(q) ||
        a.guarantorPhone.toLowerCase().includes(q)
      );
    });
  }, [apps, debouncedQuery]);

  const counts = useMemo(() => {
    const base = {
      PENDING: 0,
      NEEDS_INFO: 0,
      APPROVED: 0,
      REJECTED: 0,
    } as Record<DriverApplicationStatus, number>;
    for (const a of apps) {
      if (a.applicationStatus)
        base[a.applicationStatus] = (base[a.applicationStatus] || 0) + 1;
    }
    // In case your API always returns the selected status only, this still works (shows all as 0 except current list)
    return base;
  }, [apps]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const vans = filtered.filter((a) => a.vehicleType === "VAN").length;
    const bikes = filtered.filter((a) => a.vehicleType === "BIKE").length;
    const breached = filtered.filter(
      (a) => formatSla(a.createdAt) === "SLA breached",
    ).length;
    return { total, vans, bikes, breached };
  }, [filtered]);

  return (
    <Sidebar>
      <style>{`input::placeholder { color: var(--text-secondary); }`}</style>

      <div className="space-y-6">
        {/* Sticky header */}
        <div className="sticky top-0 z-20 pt-2">
          <div
            className="rounded-2xl border px-4 sm:px-6 py-4 backdrop-blur"
            style={{
              backgroundColor:
                "color-mix(in srgb, var(--bg-primary) 85%, transparent)",
              borderColor: "var(--border-medium)",
            }}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h1
                  className="text-2xl sm:text-3xl font-bold header"
                  style={{ color: "var(--text-primary)" }}
                >
                  Driver Applications
                </h1>
                <p
                  className="text-sm mt-1"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Review new driver onboarding submissions. Click a row to open
                  details.
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Pill label={`Showing: ${stats.total}`} tone="slate" />
                  <Pill label={`Vans: ${stats.vans}`} tone="teal" />
                  <Pill label={`Bikes: ${stats.bikes}`} tone="teal" />
                  <Pill
                    label={`SLA breached: ${stats.breached}`}
                    tone={stats.breached ? "red" : "slate"}
                  />
                </div>
              </div>

              <div className="flex flex-col sm:items-end gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Segmented
                    value={status}
                    onChange={(v) => setStatus(v as DriverApplicationStatus)}
                    options={[
                      {
                        value: "PENDING",
                        label: DRIVER_APPLICATION_STATUS_LABELS.PENDING,
                        count: counts.PENDING,
                      },
                      {
                        value: "NEEDS_INFO",
                        label: DRIVER_APPLICATION_STATUS_LABELS.NEEDS_INFO,
                        count: counts.NEEDS_INFO,
                      },
                      {
                        value: "APPROVED",
                        label: DRIVER_APPLICATION_STATUS_LABELS.APPROVED,
                        count: counts.APPROVED,
                      },
                      {
                        value: "REJECTED",
                        label: DRIVER_APPLICATION_STATUS_LABELS.REJECTED,
                        count: counts.REJECTED,
                      },
                    ]}
                  />

                  <div
                    className="rounded-xl border px-3 py-2"
                    style={{
                      backgroundColor: "var(--bg-secondary)",
                      borderColor: "var(--border-medium)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <label
                      className="text-xs font-semibold"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Vehicle
                    </label>
                    <div className="mt-1">
                      <select
                        value={vehicleType}
                        onChange={(e) => setVehicleType(e.target.value as any)}
                        className="bg-transparent outline-none text-sm"
                        style={{ color: "var(--text-primary)" }}
                      >
                        <option value="ALL">All</option>
                        <option value="VAN">Van</option>
                        <option value="BIKE">Bike</option>
                      </select>
                    </div>
                  </div>

                  <Button
                    onClick={load}
                    disabled={isLoading}
                    variant="secondary"
                    leftIcon={
                      <RefreshCcw
                        className={cn("h-4 w-4", isLoading && "animate-spin")}
                      />
                    }
                  >
                    Refresh
                  </Button>
                </div>

                <div
                  className="relative rounded-xl border overflow-hidden w-[min(760px,100%)]"
                  style={{
                    backgroundColor: "var(--bg-secondary)",
                    borderColor: "var(--border-medium)",
                  }}
                >
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5"
                    style={{ color: "var(--text-secondary)" }}
                  />
                  <input
                    type="text"
                    placeholder="Search by name, plate, guarantor name or phone…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 bg-transparent outline-none text-sm"
                    style={{ color: "var(--text-primary)" }}
                  />
                  {searchQuery ? (
                    <button
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:opacity-80"
                      style={{ color: "var(--text-secondary)" }}
                      onClick={() => setSearchQuery("")}
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            {error ? (
              <div
                className="mt-4 rounded-xl border px-4 py-3 text-sm"
                style={{
                  backgroundColor: "rgba(239, 68, 68, 0.10)",
                  borderColor: "rgba(239, 68, 68, 0.30)",
                  color: "#ef4444",
                }}
              >
                {error}
              </div>
            ) : null}
          </div>
        </div>

        {/* Table */}
        <div
          className="rounded-2xl border overflow-hidden"
          style={{
            backgroundColor: "var(--bg-secondary)",
            borderColor: "var(--border-medium)",
          }}
        >
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr
                  className="text-xs font-semibold uppercase tracking-wider sticky top-0 z-10"
                  style={{
                    color: "var(--text-secondary)",
                    backgroundColor: "var(--bg-tertiary)",
                  }}
                >
                  <th className="px-5 py-4 text-left">Driver</th>
                  <th className="px-5 py-4 text-left">Vehicle</th>
                  <th className="px-5 py-4 text-left">Plate</th>
                  <th className="px-5 py-4 text-left">Status</th>
                  <th className="px-5 py-4 text-left">Guarantor</th>
                  <th className="px-5 py-4 text-left">Submitted</th>
                  <th className="px-5 py-4 text-left">SLA</th>
                </tr>
              </thead>

              <tbody>
                {isLoading ? (
                  <>
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                  </>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-14 text-center">
                      <div
                        className="text-sm font-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        No applications found
                      </div>
                      <div
                        className="text-sm mt-1"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Try clearing search or switching filters.
                      </div>
                      <div className="mt-4 flex justify-center gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => setSearchQuery("")}
                        >
                          Clear search
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => setVehicleType("ALL")}
                        >
                          Reset vehicle
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((a, idx) => {
                    const Icon = vehicleIcon(a.vehicleType);
                    const sla = formatSla(a.createdAt);

                    return (
                      <tr
                        key={a.id}
                        className="border-t cursor-pointer transition"
                        style={{
                          borderColor: "var(--border-medium)",
                          backgroundColor:
                            idx % 2 === 0
                              ? "transparent"
                              : "rgba(100,116,139,0.04)",
                        }}
                        onClick={() => setSelected(a)}
                        onMouseEnter={(e) => {
                          (e.currentTarget as any).style.backgroundColor =
                            "rgba(46,196,182,0.06)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as any).style.backgroundColor =
                            idx % 2 === 0
                              ? "transparent"
                              : "rgba(100,116,139,0.04)";
                        }}
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div
                                className="font-semibold truncate"
                                style={{ color: "var(--text-primary)" }}
                              >
                                {a.driverName}
                              </div>
                              <div
                                className="text-xs truncate"
                                style={{ color: "var(--text-secondary)" }}
                              >
                                {a.driverAddress}
                              </div>
                            </div>
                            <ChevronRight
                              className="h-4 w-4 opacity-40"
                              style={{ color: "var(--text-secondary)" }}
                            />
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-8 w-8 rounded-lg flex items-center justify-center"
                              style={{
                                backgroundColor: "rgba(46, 196, 182, 0.12)",
                              }}
                            >
                              <Icon
                                className="h-4 w-4"
                                style={{ color: "var(--accent-teal)" }}
                              />
                            </div>
                            <Pill
                              label={VEHICLE_TYPE_LABELS[a.vehicleType]}
                              tone="teal"
                            />
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className="text-sm font-semibold"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {a.plateNumber}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <Pill
                            label={
                              a.applicationStatus
                                ? DRIVER_APPLICATION_STATUS_LABELS[
                                    a.applicationStatus
                                  ]
                                : "—"
                            }
                            tone={applicationTone(a.applicationStatus)}
                          />
                        </td>

                        <td className="px-5 py-4">
                          <div
                            className="text-sm font-semibold"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {a.guarantorName}
                          </div>
                          <div
                            className="text-xs"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            {a.guarantorPhone}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className="text-sm"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            {formatTimestamp(a.createdAt)}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          {sla === "SLA breached" ? (
                            <span className="inline-flex items-center gap-2">
                              <Pill label="SLA breached" tone="red" />
                            </span>
                          ) : (
                            <Pill label={sla} tone="slate" />
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Helper / Tip */}
        <div
          className="rounded-2xl border p-4"
          style={{
            backgroundColor: "var(--bg-secondary)",
            borderColor: "var(--border-medium)",
          }}
        >
          <div className="flex items-start gap-2">
            <Users
              className="h-5 w-5 mt-0.5"
              style={{ color: "var(--accent-teal)" }}
            />
            <div>
              <div
                className="text-sm font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                Workflow tip
              </div>
              <div
                className="text-sm mt-1"
                style={{ color: "var(--text-secondary)" }}
              >
                Use the status tabs to batch-review. Open a row to quickly
                approve/request info/reject, and check missing documents.
              </div>
            </div>
          </div>
        </div>

        {selected ? (
          <ApplicationModal
            app={selected}
            onClose={() => setSelected(null)}
            onUpdated={load}
          />
        ) : null}
      </div>
    </Sidebar>
  );
}
