import React, { useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "../../components/sidebar";
import { driversApi } from "../../services/driversApi";
import { getApiBaseUrl, getApiErrorMessage } from "../../services/apiClient";
import type {
  DriverApplication,
  DriverApplicationStatus,
  DriverStatus,
  VehicleType,
} from "../../types/driver";
import {
  DRIVER_APPLICATION_STATUS_LABELS,
  DRIVER_STATUS_LABELS,
  VEHICLE_TYPE_LABELS,
} from "../../types/driver";
import {
  Bike,
  Car,
  FileText,
  Search,
  Shield,
  Truck,
  X,
  RefreshCcw,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Ban,
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

function buildFileUrl(path: string): string {
  const base = getApiBaseUrl().replace(/\/$/, "");
  const p = String(path || "").replace(/^\//, "");
  return `${base}/${p}`;
}

function vehicleIcon(type: VehicleType) {
  if (type === "VAN") return Car;
  if (type === "BIKE") return Bike;
  return Truck;
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

function statusTone(status?: DriverStatus): Tone {
  if (status === "AVAILABLE") return "teal";
  if (status === "BUSY") return "amber";
  if (status === "SUSPENDED") return "red";
  return "slate";
}

function appTone(status?: DriverApplicationStatus): Tone {
  if (status === "APPROVED") return "green";
  if (status === "NEEDS_INFO") return "red";
  if (status === "PENDING") return "amber";
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
  variant?: "primary" | "secondary" | "danger" | "ghost";
  leftIcon?: React.ReactNode;
}) {
  const styles: Record<string, React.CSSProperties> = {
    primary: {
      backgroundColor: "rgba(46, 196, 182, 0.14)",
      borderColor: "rgba(46, 196, 182, 0.30)",
      color: "var(--accent-teal)",
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
    ghost: {
      backgroundColor: "transparent",
      borderColor: "transparent",
      color: "var(--text-primary)",
    },
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition active:scale-[0.99]",
        disabled && "opacity-60 cursor-not-allowed",
        variant === "ghost" && "hover:opacity-80",
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
  options: Array<{ value: string; label: string; icon?: React.ReactNode }>;
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
            {opt.icon ? <span className="shrink-0">{opt.icon}</span> : null}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-t" style={{ borderColor: "var(--border-medium)" }}>
      {Array.from({ length: 5 }).map((_, i) => (
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

  // Better modal behavior
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtnRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const setDriverStatus = async (status: DriverStatus) => {
    if (isWorking) return;
    setIsWorking(true);
    setError(null);
    try {
      await driversApi.updateDriverStatus(app.id, status);
      onUpdated();
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsWorking(false);
    }
  };

  const requestDocs = async () => {
    if (isWorking) return;
    setIsWorking(true);
    setError(null);
    try {
      await driversApi.updateApplicationStatus(app.id, "NEEDS_INFO");
      onUpdated();
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsWorking(false);
    }
  };

  const DocCard = ({ label, path }: { label: string; path: string }) => {
    const missing = !path;
    const url = missing ? "" : buildFileUrl(path);

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
            <FileText
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

        <div className="flex items-center gap-2">
          {missing ? (
            <span
              className="text-xs inline-flex items-center gap-1"
              style={{ color: "var(--text-secondary)" }}
            >
              <AlertTriangle className="h-4 w-4" />
              Missing
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
        </div>
      </a>
    );
  };

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
                    <span className="whitespace-nowrap">
                      Updated {formatTimestamp(app.updatedAt)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {app.applicationStatus ? (
                  <Pill
                    label={
                      DRIVER_APPLICATION_STATUS_LABELS[
                        app.applicationStatus as DriverApplicationStatus
                      ]
                    }
                    tone={appTone(
                      app.applicationStatus as DriverApplicationStatus,
                    )}
                  />
                ) : null}
                {app.status ? (
                  <Pill
                    label={DRIVER_STATUS_LABELS[app.status as DriverStatus]}
                    tone={statusTone(app.status as DriverStatus)}
                  />
                ) : null}
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

            {/* Quick actions */}
            <div
              className="rounded-2xl border p-4 sm:p-5"
              style={{
                borderColor: "var(--border-medium)",
                backgroundColor: "var(--bg-secondary)",
              }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="min-w-0">
                  <div
                    className="text-sm font-bold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Quick actions
                  </div>
                  <div
                    className="text-xs mt-1"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Update availability, suspend, or request document re-upload.
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    disabled={isWorking}
                    onClick={() => setDriverStatus("AVAILABLE")}
                    variant="primary"
                    leftIcon={<CheckCircle2 className="h-4 w-4" />}
                  >
                    Set Available
                  </Button>

                  <Button
                    disabled={isWorking}
                    onClick={() => setDriverStatus("OFFLINE")}
                    variant="secondary"
                    leftIcon={<CircleDashed className="h-4 w-4" />}
                  >
                    Set Offline
                  </Button>

                  <Button
                    disabled={isWorking}
                    onClick={() => setDriverStatus("SUSPENDED")}
                    variant="danger"
                    leftIcon={<Ban className="h-4 w-4" />}
                  >
                    Suspend
                  </Button>

                  <Button
                    disabled={isWorking}
                    onClick={requestDocs}
                    variant="secondary"
                    leftIcon={<FileText className="h-4 w-4" />}
                  >
                    Request doc update
                  </Button>
                </div>
              </div>
            </div>

            {/* Documents */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div
                    className="text-sm font-bold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Documents
                  </div>
                  <div
                    className="text-xs mt-1"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Click a card to open the uploaded file.
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <DocCard
                  label="Proof of ownership"
                  path={app.proofOfOwnershipPath}
                />
                <DocCard
                  label="Vehicle license"
                  path={app.vehicleLicensePath}
                />
                <DocCard label="Hackney permit" path={app.hackneyPermitPath} />
                <DocCard
                  label="Vehicle insurance"
                  path={app.vehicleInsurancePath}
                />
                <DocCard label="Vehicle video" path={app.vehicleVideoPath} />
                <DocCard
                  label="Driver's license"
                  path={app.driversLicensePath}
                />
                <DocCard label="Means of ID" path={app.meansOfIdPath} />
                <DocCard
                  label="Driver face photo"
                  path={app.driverFacePhotoPath}
                />
                <DocCard
                  label="Driver full body photo"
                  path={app.driverFullBodyPhotoPath}
                />
                <DocCard
                  label="Guarantor ID"
                  path={app.guarantorMeansOfIdPath}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DriversDirectory() {
  const [drivers, setDrivers] = useState<DriverApplication[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [status, setStatus] = useState<"ALL" | DriverStatus>("ALL");
  const [selected, setSelected] = useState<DriverApplication | null>(null);

  // Debounce search for smoother UX on large lists
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
      const data = await driversApi.listDirectory(
        status === "ALL" ? undefined : { status },
      );
      setDrivers(data);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const filtered = useMemo(() => {
    const q = debouncedQuery.toLowerCase();
    if (!q) return drivers;

    return drivers.filter((d) => {
      return (
        d.driverName.toLowerCase().includes(q) ||
        d.plateNumber.toLowerCase().includes(q) ||
        d.guarantorName.toLowerCase().includes(q) ||
        d.guarantorPhone.toLowerCase().includes(q)
      );
    });
  }, [drivers, debouncedQuery]);

  const stats = useMemo(() => {
    const total = drivers.length;
    const available = drivers.filter((d) => d.status === "AVAILABLE").length;
    const busy = drivers.filter((d) => d.status === "BUSY").length;
    const offline = drivers.filter((d) => d.status === "OFFLINE").length;
    const suspended = drivers.filter((d) => d.status === "SUSPENDED").length;
    return { total, available, busy, offline, suspended };
  }, [drivers]);

  return (
    <Sidebar>
      <style>{`input::placeholder { color: var(--text-secondary); }`}</style>

      <div className="space-y-6">
        {/* Sticky top header */}
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
                  Drivers Directory
                </h1>
                <p
                  className="text-sm mt-1"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Approved drivers and their current availability.
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Pill label={`Total: ${stats.total}`} tone="slate" />
                  <Pill label={`Available: ${stats.available}`} tone="teal" />
                  <Pill label={`Busy: ${stats.busy}`} tone="amber" />
                  <Pill label={`Offline: ${stats.offline}`} tone="slate" />
                  <Pill label={`Suspended: ${stats.suspended}`} tone="red" />
                </div>
              </div>

              <div className="flex flex-col sm:items-end gap-3">
                <Segmented
                  value={status}
                  onChange={(v) => setStatus(v as any)}
                  options={[
                    { value: "ALL", label: "All" },
                    { value: "AVAILABLE", label: "Available" },
                    { value: "BUSY", label: "Busy" },
                    { value: "OFFLINE", label: "Offline" },
                    { value: "SUSPENDED", label: "Suspended" },
                  ]}
                />

                <div className="flex items-center gap-2">
                  <div
                    className="relative rounded-xl border overflow-hidden w-[min(520px,100%)]"
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
                      placeholder="Search by name, plate, guarantor…"
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
                  <th className="px-5 py-4 text-left">Updated</th>
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
                    <td colSpan={5} className="px-5 py-14 text-center">
                      <div
                        className="text-sm font-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        No drivers found
                      </div>
                      <div
                        className="text-sm mt-1"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Try clearing your search or switching the status filter.
                      </div>
                      <div className="mt-4">
                        <Button
                          variant="secondary"
                          onClick={() => setSearchQuery("")}
                        >
                          Clear search
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((d, idx) => {
                    const Icon = vehicleIcon(d.vehicleType);
                    return (
                      <tr
                        key={d.id}
                        className={cn("border-t cursor-pointer transition")}
                        style={{
                          borderColor: "var(--border-medium)",
                          backgroundColor:
                            idx % 2 === 0
                              ? "transparent"
                              : "rgba(100,116,139,0.04)",
                        }}
                        onClick={() => setSelected(d)}
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
                                {d.driverName}
                              </div>
                              <div
                                className="text-xs truncate"
                                style={{ color: "var(--text-secondary)" }}
                              >
                                {d.driverAddress}
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
                              label={VEHICLE_TYPE_LABELS[d.vehicleType]}
                              tone="teal"
                            />
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className="text-sm font-semibold"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {d.plateNumber}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <Pill
                            label={
                              d.status
                                ? DRIVER_STATUS_LABELS[d.status as DriverStatus]
                                : "Unknown"
                            }
                            tone={statusTone(d.status as DriverStatus)}
                          />
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className="text-sm"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            {formatTimestamp(d.updatedAt)}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tip card */}
        <div
          className="rounded-2xl border p-4"
          style={{
            backgroundColor: "var(--bg-secondary)",
            borderColor: "var(--border-medium)",
          }}
        >
          <div className="flex items-start gap-2">
            <Shield
              className="h-5 w-5 mt-0.5"
              style={{ color: "var(--accent-teal)" }}
            />
            <div>
              <div
                className="text-sm font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                Tip
              </div>
              <div
                className="text-sm mt-1"
                style={{ color: "var(--text-secondary)" }}
              >
                Click any row to open the driver profile and quickly
                Suspend/Activate or request document updates.
              </div>
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
    </Sidebar>
  );
}
