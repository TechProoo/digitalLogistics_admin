import React, { useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "../../components/sidebar";
import { driversApi } from "../../services/driversApi";
import { getApiErrorMessage, apiClient } from "../../services/apiClient";
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
  Loader2,
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
  Users,
  Activity,
  Clock,
} from "lucide-react";

/* helpers */
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

function timeAgo(ts: string) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

async function fetchFileUrl(r2Key: string): Promise<string> {
  try {
    const res = await apiClient.get("/uploads/view", {
      params: { key: r2Key },
    });
    return (res.data as any)?.url ?? (res.data as any) ?? "";
  } catch {
    return "";
  }
}

function vehicleIcon(type: VehicleType) {
  if (type === "VAN") return Car;
  if (type === "BIKE") return Bike;
  return Truck;
}

/* tone config — all colours use the original CSS vars */
type Tone = "teal" | "slate" | "amber" | "green" | "red";

const TONE_STYLES: Record<Tone, React.CSSProperties> = {
  teal: {
    backgroundColor: "rgba(46,196,182,0.12)",
    border: "1px solid rgba(46,196,182,0.30)",
    color: "var(--accent-teal)",
  },
  amber: {
    backgroundColor: "rgba(245,158,11,0.12)",
    border: "1px solid rgba(245,158,11,0.30)",
    color: "#f59e0b",
  },
  green: {
    backgroundColor: "rgba(34,197,94,0.12)",
    border: "1px solid rgba(34,197,94,0.30)",
    color: "var(--status-success)",
  },
  red: {
    backgroundColor: "rgba(239,68,68,0.12)",
    border: "1px solid rgba(239,68,68,0.30)",
    color: "#ef4444",
  },
  slate: {
    backgroundColor: "rgba(100,116,139,0.12)",
    border: "1px solid rgba(100,116,139,0.25)",
    color: "var(--text-secondary)",
  },
};

const TONE_DOT: Record<Tone, string> = {
  teal: "var(--accent-teal)",
  amber: "#f59e0b",
  green: "var(--status-success)",
  red: "#ef4444",
  slate: "var(--text-secondary)",
};

function statusTone(s?: DriverStatus): Tone {
  if (s === "AVAILABLE") return "teal";
  if (s === "BUSY") return "amber";
  if (s === "SUSPENDED") return "red";
  return "slate";
}
function appTone(s?: DriverApplicationStatus): Tone {
  if (s === "APPROVED") return "green";
  if (s === "NEEDS_INFO") return "red";
  if (s === "PENDING") return "amber";
  return "slate";
}

/* atoms */
function StatusBadge({
  label,
  tone,
  pulse,
}: {
  label: string;
  tone: Tone;
  pulse?: boolean;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide whitespace-nowrap"
      style={TONE_STYLES[tone]}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full shrink-0",
          pulse && tone === "teal" && "animate-pulse",
        )}
        style={{ background: TONE_DOT[tone] }}
      />
      {label}
    </span>
  );
}

function Btn({
  children,
  onClick,
  disabled,
  variant = "secondary",
  leftIcon,
  size = "md",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  leftIcon?: React.ReactNode;
  size?: "sm" | "md";
}) {
  const vstyle: Record<string, React.CSSProperties> = {
    primary: {
      backgroundColor: "rgba(46,196,182,0.14)",
      borderColor: "rgba(46,196,182,0.30)",
      color: "var(--accent-teal)",
    },
    secondary: {
      backgroundColor: "var(--bg-secondary)",
      borderColor: "var(--border-medium)",
      color: "var(--text-primary)",
    },
    danger: {
      backgroundColor: "rgba(239,68,68,0.12)",
      borderColor: "rgba(239,68,68,0.30)",
      color: "#ef4444",
    },
    ghost: {
      backgroundColor: "transparent",
      borderColor: "transparent",
      color: "var(--text-primary)",
    },
  };
  const pad = size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2.5 text-sm";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl border font-semibold transition-all duration-150 active:scale-[0.98]",
        pad,
        disabled
          ? "opacity-50 cursor-not-allowed"
          : "hover:opacity-90 cursor-pointer",
      )}
      style={vstyle[variant]}
    >
      {leftIcon && <span className="shrink-0">{leftIcon}</span>}
      <span>{children}</span>
    </button>
  );
}

function StatCard({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: number;
  tone: Tone;
  icon: React.ElementType;
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-2xl border px-4 py-3"
      style={TONE_STYLES[tone]}
    >
      <div
        className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: "rgba(0,0,0,0.15)" }}
      >
        <Icon className="h-4 w-4" style={{ color: TONE_DOT[tone] }} />
      </div>
      <div>
        <div
          className="text-xl font-bold tabular-nums leading-none"
          style={{ color: TONE_DOT[tone] }}
        >
          {value}
        </div>
        <div
          className="text-xs mt-0.5 font-medium"
          style={{ color: "var(--text-secondary)" }}
        >
          {label}
        </div>
      </div>
    </div>
  );
}

function FilterPill({
  label,
  active,
  onClick,
  tone,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  tone: Tone;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-full border px-4 py-1.5 text-sm font-semibold transition-all duration-150"
      style={
        active
          ? TONE_STYLES[tone]
          : {
              backgroundColor: "var(--bg-secondary)",
              borderColor: "var(--border-medium)",
              color: "var(--text-secondary)",
            }
      }
    >
      {label}
    </button>
  );
}

function SkeletonRow() {
  return (
    <tr style={{ borderBottom: "1px solid var(--border-medium)" }}>
      {[220, 110, 85, 90, 80].map((w, i) => (
        <td key={i} className="px-6 py-4">
          <div
            className="h-4 rounded-lg animate-pulse"
            style={{ width: w, backgroundColor: "var(--bg-tertiary)" }}
          />
          {i === 0 && (
            <div
              className="h-3 mt-2 rounded-lg animate-pulse"
              style={{ width: 150, backgroundColor: "var(--bg-tertiary)" }}
            />
          )}
        </td>
      ))}
    </tr>
  );
}

/* doc card */
function DocCard({ label, path }: { label: string; path: string }) {
  const missing = !path;
  const [loading, setLoading] = useState(false);
  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (missing || loading) return;
    setLoading(true);
    try {
      const url = await fetchFileUrl(path);
      if (url) window.open(url, "_blank", "noreferrer");
    } finally {
      setLoading(false);
    }
  };
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={missing}
      className={cn(
        "group flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-left w-full transition-all duration-150",
        missing
          ? "opacity-60 cursor-not-allowed"
          : "hover:opacity-90 cursor-pointer",
      )}
      style={{
        backgroundColor: "var(--bg-secondary)",
        borderColor: "var(--border-medium)",
        color: "var(--text-primary)",
      }}
    >
      <div
        className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
        style={{
          backgroundColor: missing
            ? "rgba(100,116,139,0.12)"
            : "rgba(46,196,182,0.12)",
        }}
      >
        {loading ? (
          <Loader2
            className="h-4 w-4 animate-spin"
            style={{ color: "var(--accent-teal)" }}
          />
        ) : missing ? (
          <AlertTriangle
            className="h-4 w-4"
            style={{ color: "var(--text-secondary)" }}
          />
        ) : (
          <FileText
            className="h-4 w-4"
            style={{ color: "var(--accent-teal)" }}
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div
          className="text-sm font-semibold truncate"
          style={{ color: "var(--text-primary)" }}
        >
          {label}
        </div>
        <div
          className="text-xs mt-0.5"
          style={{ color: "var(--text-secondary)" }}
        >
          {missing ? "Not uploaded" : loading ? "Opening..." : "Tap to view"}
        </div>
      </div>
      {!missing && !loading && (
        <ChevronRight
          className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5"
          style={{ color: "var(--text-secondary)" }}
        />
      )}
    </button>
  );
}

/* modal */
function DriverModal({
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
  const [activeTab, setActiveTab] = useState<"overview" | "documents">(
    "overview",
  );
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const runAction = async (fn: () => Promise<void>) => {
    if (isWorking) return;
    setIsWorking(true);
    setError(null);
    try {
      await fn();
      onUpdated();
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsWorking(false);
    }
  };

  const docs = [
    { label: "Proof of Ownership", path: app.proofOfOwnershipPath },
    { label: "Vehicle License", path: app.vehicleLicensePath },
    { label: "Hackney Permit", path: app.hackneyPermitPath },
    { label: "Vehicle Insurance", path: app.vehicleInsurancePath },
    { label: "Vehicle Video", path: app.vehicleVideoPath },
    { label: "Driver's License", path: app.driversLicensePath },
    { label: "Means of ID", path: app.meansOfIdPath },
    { label: "Face Photo", path: app.driverFacePhotoPath },
    { label: "Full Body Photo", path: app.driverFullBodyPhotoPath },
    { label: "Guarantor ID", path: app.guarantorMeansOfIdPath },
  ];

  const docsDone = docs.filter((d) => !!d.path).length;
  const pct = Math.round((docsDone / docs.length) * 100);
  const tone = statusTone(app.status as DriverStatus);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ backgroundColor: "rgba(0,0,0,0.60)" }}
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-2xl rounded-3xl border overflow-hidden shadow-2xl flex flex-col"
        style={{
          backgroundColor: "var(--bg-primary)",
          borderColor: "var(--border-medium)",
          maxHeight: "90vh",
        }}
      >
        <div
          className="h-px w-full shrink-0"
          style={{ backgroundColor: "var(--accent-teal)", opacity: 0.5 }}
        />

        {/* header */}
        <div className="px-6 pt-5 pb-0 shrink-0">
          <div className="flex items-start gap-4 mb-4">
            <div
              className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 text-xl font-black"
              style={TONE_STYLES[tone]}
            >
              {app.driverName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2
                    className="text-xl font-bold leading-tight"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {app.driverName}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    {app.status && (
                      <StatusBadge
                        label={DRIVER_STATUS_LABELS[app.status as DriverStatus]}
                        tone={tone}
                        pulse
                      />
                    )}
                    {app.applicationStatus && (
                      <StatusBadge
                        label={
                          DRIVER_APPLICATION_STATUS_LABELS[
                            app.applicationStatus as DriverApplicationStatus
                          ]
                        }
                        tone={appTone(
                          app.applicationStatus as DriverApplicationStatus,
                        )}
                      />
                    )}
                    <span
                      className="inline-flex items-center gap-1.5 text-xs"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {VEHICLE_TYPE_LABELS[app.vehicleType]}
                      <span className="opacity-40">·</span>
                      <span
                        style={{
                          letterSpacing: "0.05em",
                          fontFamily: "monospace",
                        }}
                      >
                        {app.plateNumber}
                      </span>
                    </span>
                  </div>
                </div>
                <button
                  ref={closeBtnRef}
                  onClick={onClose}
                  className="h-9 w-9 rounded-xl flex items-center justify-center border shrink-0 transition hover:opacity-80"
                  style={{
                    backgroundColor: "var(--bg-secondary)",
                    borderColor: "var(--border-medium)",
                    color: "var(--text-secondary)",
                  }}
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* tabs */}
          <div
            className="flex border-b"
            style={{ borderColor: "var(--border-medium)" }}
          >
            {(["overview", "documents"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="relative pb-3 pt-1 pr-6 text-sm font-semibold capitalize transition"
                style={{
                  color:
                    activeTab === tab
                      ? "var(--text-primary)"
                      : "var(--text-secondary)",
                }}
              >
                {tab}
                {tab === "documents" && (
                  <span
                    className="ml-2 rounded-full px-1.5 py-0.5 text-xs"
                    style={{
                      backgroundColor: "var(--bg-tertiary)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {docsDone}/{docs.length}
                  </span>
                )}
                {activeTab === tab && (
                  <span
                    className="absolute bottom-0 left-0 right-6 h-0.5 rounded-full"
                    style={{ backgroundColor: "var(--accent-teal)" }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && (
            <div
              className="rounded-2xl border px-4 py-3 text-sm flex items-center gap-2"
              style={{
                backgroundColor: "rgba(239,68,68,0.10)",
                borderColor: "rgba(239,68,68,0.30)",
                color: "#ef4444",
              }}
            >
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {activeTab === "overview" && (
            <>
              {/* info grid */}
              <div
                className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-2xl border p-4"
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  borderColor: "var(--border-medium)",
                }}
              >
                {[
                  { label: "Address", value: app.driverAddress },
                  { label: "Plate Number", value: app.plateNumber },
                  { label: "Guarantor", value: app.guarantorName },
                  { label: "Guarantor Phone", value: app.guarantorPhone },
                  {
                    label: "Last Updated",
                    value: formatTimestamp(app.updatedAt),
                  },
                  {
                    label: "Vehicle Type",
                    value: VEHICLE_TYPE_LABELS[app.vehicleType],
                  },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div
                      className="text-xs font-medium mb-0.5"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {label}
                    </div>
                    <div
                      className="text-sm font-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {value || "—"}
                    </div>
                  </div>
                ))}
              </div>

              {/* doc progress */}
              <div
                className="rounded-2xl border p-4"
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  borderColor: "var(--border-medium)",
                }}
              >
                <div className="flex items-center justify-between mb-2.5">
                  <span
                    className="text-xs font-semibold"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Document Completeness
                  </span>
                  <span
                    className="text-xs font-bold"
                    style={{
                      color: pct === 100 ? "var(--status-success)" : "#f59e0b",
                    }}
                  >
                    {pct}%
                  </span>
                </div>
                <div
                  className="h-1.5 rounded-full overflow-hidden"
                  style={{ backgroundColor: "var(--bg-tertiary)" }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${pct}%`,
                      backgroundColor:
                        pct === 100 ? "var(--status-success)" : "#f59e0b",
                    }}
                  />
                </div>
                <div
                  className="text-xs mt-1.5"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {docsDone} of {docs.length} documents uploaded
                </div>
              </div>

              {/* actions */}
              <div
                className="rounded-2xl border p-4 space-y-3"
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  borderColor: "var(--border-medium)",
                }}
              >
                <div
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Quick Actions
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Btn
                    disabled={isWorking}
                    onClick={() =>
                      runAction(async () => {
                        await driversApi.updateDriverStatus(
                          app.id,
                          "AVAILABLE",
                        );
                      })
                    }
                    variant="primary"
                    leftIcon={<CheckCircle2 className="h-4 w-4" />}
                  >
                    Set Available
                  </Btn>
                  <Btn
                    disabled={isWorking}
                    onClick={() =>
                      runAction(async () => {
                        await driversApi.updateDriverStatus(app.id, "OFFLINE");
                      })
                    }
                    variant="secondary"
                    leftIcon={<CircleDashed className="h-4 w-4" />}
                  >
                    Set Offline
                  </Btn>
                  <Btn
                    disabled={isWorking}
                    onClick={() =>
                      runAction(async () => {
                        await driversApi.updateDriverStatus(
                          app.id,
                          "SUSPENDED",
                        );
                      })
                    }
                    variant="danger"
                    leftIcon={<Ban className="h-4 w-4" />}
                  >
                    Suspend Driver
                  </Btn>
                  <Btn
                    disabled={isWorking}
                    onClick={() =>
                      runAction(async () => {
                        await driversApi.updateApplicationStatus(
                          app.id,
                          "NEEDS_INFO",
                        );
                      })
                    }
                    variant="secondary"
                    leftIcon={<FileText className="h-4 w-4" />}
                  >
                    Request Docs
                  </Btn>
                </div>
              </div>
            </>
          )}

          {activeTab === "documents" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {docs.map((d) => (
                <DocCard key={d.label} label={d.label} path={d.path} />
              ))}
            </div>
          )}
        </div>

        {isWorking && (
          <div
            className="absolute inset-0 flex items-center justify-center rounded-3xl"
            style={{
              backgroundColor: "rgba(0,0,0,0.50)",
              backdropFilter: "blur(4px)",
            }}
          >
            <div className="flex flex-col items-center gap-3">
              <Loader2
                className="h-8 w-8 animate-spin"
                style={{ color: "var(--accent-teal)" }}
              />
              <span
                className="text-sm font-semibold"
                style={{ color: "var(--text-secondary)" }}
              >
                Updating...
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* main page */
export default function DriversDirectory() {
  const [drivers, setDrivers] = useState<DriverApplication[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [status, setStatus] = useState<"ALL" | DriverStatus>("ALL");
  const [selected, setSelected] = useState<DriverApplication | null>(null);

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
      setDrivers(
        await driversApi.listDirectory(
          status === "ALL" ? undefined : { status },
        ),
      );
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [status]); // eslint-disable-line

  const filtered = useMemo(() => {
    const q = debouncedQuery.toLowerCase();
    if (!q) return drivers;
    return drivers.filter(
      (d) =>
        d.driverName.toLowerCase().includes(q) ||
        d.plateNumber.toLowerCase().includes(q) ||
        d.guarantorName.toLowerCase().includes(q) ||
        d.guarantorPhone.toLowerCase().includes(q),
    );
  }, [drivers, debouncedQuery]);

  const stats = useMemo(
    () => ({
      total: drivers.length,
      available: drivers.filter((d) => d.status === "AVAILABLE").length,
      busy: drivers.filter((d) => d.status === "BUSY").length,
      offline: drivers.filter((d) => d.status === "OFFLINE").length,
      suspended: drivers.filter((d) => d.status === "SUSPENDED").length,
    }),
    [drivers],
  );

  const FILTERS: Array<{ value: string; label: string; tone: Tone }> = [
    { value: "ALL", label: `All  ${stats.total}`, tone: "slate" },
    {
      value: "AVAILABLE",
      label: `Available  ${stats.available}`,
      tone: "teal",
    },
    { value: "BUSY", label: `Busy  ${stats.busy}`, tone: "amber" },
    { value: "OFFLINE", label: `Offline  ${stats.offline}`, tone: "slate" },
    { value: "SUSPENDED", label: `Suspended  ${stats.suspended}`, tone: "red" },
  ];

  return (
    <Sidebar>
      <style>{`
        input::placeholder { color: var(--text-secondary) !important; }
        .driver-row { cursor: pointer; border-bottom: 1px solid var(--border-medium); transition: background 0.12s ease; }
        .driver-row:hover { background: rgba(46,196,182,0.06) !important; }
        .driver-row:hover .row-caret { opacity: 1; transform: translateX(3px); }
        .row-caret { opacity: 0; transition: opacity 0.15s, transform 0.15s; }
        .search-wrap:focus-within { box-shadow: 0 0 0 2px rgba(46,196,182,0.25); border-color: rgba(46,196,182,0.40) !important; }
      `}</style>

      <div className="space-y-4">
        {/* header card */}
        <div
          className="rounded-3xl border overflow-hidden"
          style={{
            backgroundColor: "var(--bg-secondary)",
            borderColor: "var(--border-medium)",
          }}
        >
          <div
            className="h-px"
            style={{ backgroundColor: "var(--accent-teal)", opacity: 0.4 }}
          />
          <div className="px-6 py-5">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-2xl flex items-center justify-center"
                    style={{
                      backgroundColor: "rgba(46,196,182,0.12)",
                      border: "1px solid rgba(46,196,182,0.25)",
                    }}
                  >
                    <Users
                      className="h-5 w-5"
                      style={{ color: "var(--accent-teal)" }}
                    />
                  </div>
                  <h1
                    className="text-2xl font-extrabold header"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Drivers Directory
                  </h1>
                </div>
                <p
                  className="text-sm mt-1 ml-13"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Manage availability, status, and documents.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <StatCard
                  label="Total"
                  value={stats.total}
                  tone="slate"
                  icon={Users}
                />
                <StatCard
                  label="Available"
                  value={stats.available}
                  tone="teal"
                  icon={Activity}
                />
                <StatCard
                  label="Busy"
                  value={stats.busy}
                  tone="amber"
                  icon={Clock}
                />
                <StatCard
                  label="Suspended"
                  value={stats.suspended}
                  tone="red"
                  icon={Ban}
                />
              </div>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row gap-2.5">
              <div
                className="search-wrap relative rounded-2xl border flex-1 transition-all"
                style={{
                  backgroundColor: "var(--bg-primary)",
                  borderColor: "var(--border-medium)",
                }}
              >
                <Search
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4"
                  style={{ color: "var(--text-secondary)" }}
                />
                <input
                  type="text"
                  placeholder="Search name, plate, guarantor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 bg-transparent outline-none text-sm"
                  style={{ color: "var(--text-primary)" }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-lg flex items-center justify-center transition hover:opacity-80"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <Btn
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
              </Btn>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {FILTERS.map((f) => (
                <FilterPill
                  key={f.value}
                  label={f.label}
                  active={status === f.value}
                  onClick={() => setStatus(f.value as any)}
                  tone={f.tone}
                />
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div
            className="rounded-2xl border px-4 py-3 text-sm flex items-center gap-2"
            style={{
              backgroundColor: "rgba(239,68,68,0.10)",
              borderColor: "rgba(239,68,68,0.30)",
              color: "#ef4444",
            }}
          >
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* table */}
        <div
          className="rounded-3xl border overflow-hidden"
          style={{
            backgroundColor: "var(--bg-secondary)",
            borderColor: "var(--border-medium)",
          }}
        >
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-medium)" }}>
                  {["Driver", "Vehicle", "Plate", "Status", "Updated"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest"
                        style={{
                          color: "var(--text-secondary)",
                          backgroundColor: "var(--bg-tertiary)",
                        }}
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <SkeletonRow key={i} />
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center">
                      <div className="inline-flex flex-col items-center gap-3">
                        <div
                          className="h-16 w-16 rounded-3xl flex items-center justify-center"
                          style={{
                            backgroundColor: "var(--bg-tertiary)",
                            border: "1px solid var(--border-medium)",
                          }}
                        >
                          <Search
                            className="h-7 w-7"
                            style={{ color: "var(--text-secondary)" }}
                          />
                        </div>
                        <div>
                          <div
                            className="font-bold text-sm"
                            style={{ color: "var(--text-primary)" }}
                          >
                            No drivers found
                          </div>
                          <div
                            className="text-xs mt-1"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            Try clearing search or changing the filter.
                          </div>
                        </div>
                        <Btn
                          size="sm"
                          variant="secondary"
                          onClick={() => setSearchQuery("")}
                        >
                          Clear search
                        </Btn>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((d) => {
                    const VIcon = vehicleIcon(d.vehicleType);
                    const tone = statusTone(d.status as DriverStatus);
                    return (
                      <tr
                        key={d.id}
                        className="driver-row"
                        onClick={() => setSelected(d)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 text-sm font-black"
                              style={TONE_STYLES[tone]}
                            >
                              {d.driverName.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div
                                className="text-sm font-semibold truncate"
                                style={{ color: "var(--text-primary)" }}
                              >
                                {d.driverName}
                              </div>
                              <div
                                className="text-xs truncate mt-0.5"
                                style={{ color: "var(--text-secondary)" }}
                              >
                                {d.driverAddress}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <VIcon
                              className="h-4 w-4"
                              style={{ color: "var(--accent-teal)" }}
                            />
                            <span
                              className="text-sm"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              {VEHICLE_TYPE_LABELS[d.vehicleType]}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className="text-xs font-bold rounded-lg px-2.5 py-1.5 border"
                            style={{
                              backgroundColor: "var(--bg-tertiary)",
                              borderColor: "var(--border-medium)",
                              color: "var(--text-primary)",
                              letterSpacing: "0.07em",
                              fontFamily: "monospace",
                            }}
                          >
                            {d.plateNumber}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge
                            label={
                              d.status
                                ? DRIVER_STATUS_LABELS[d.status as DriverStatus]
                                : "Unknown"
                            }
                            tone={tone}
                            pulse={d.status === "AVAILABLE"}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-between gap-4">
                            <span
                              className="text-xs"
                              style={{ color: "var(--text-secondary)" }}
                              title={formatTimestamp(d.updatedAt)}
                            >
                              {timeAgo(d.updatedAt)}
                            </span>
                            <ChevronRight
                              className="row-caret h-4 w-4 shrink-0"
                              style={{ color: "var(--accent-teal)" }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {!isLoading && filtered.length > 0 && (
            <div
              className="px-6 py-3 flex items-center justify-between border-t"
              style={{ borderColor: "var(--border-medium)" }}
            >
              <span
                className="text-xs"
                style={{ color: "var(--text-secondary)" }}
              >
                Showing {filtered.length} of {drivers.length} drivers
              </span>
              <div className="flex items-center gap-1.5">
                <Shield
                  className="h-3.5 w-3.5"
                  style={{ color: "var(--accent-teal)" }}
                />
                <span
                  className="text-xs"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Click any row to manage
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {selected && (
        <DriverModal
          app={selected}
          onClose={() => setSelected(null)}
          onUpdated={load}
        />
      )}
    </Sidebar>
  );
}
