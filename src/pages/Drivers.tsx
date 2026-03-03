import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/sidebar";
import { driversApi } from "../services/driversApi";
import { getApiErrorMessage } from "../services/apiClient";
import type {
  DriverApplication,
  DriverApplicationStatus,
  VehicleType,
} from "../types/driver";
import {
  DRIVER_APPLICATION_STATUS_LABELS,
  // VEHICLE_TYPE_LABELS,
} from "../types/driver";
import {
  Bike,
  Car,
  ChevronRight,
  RefreshCcw,
  Search,
  Truck,
  Users,
  X,
} from "lucide-react";
import DriverApplicationDetail from "../pages/drivers/DriverApplicationDetail";

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
  const diff = created + 48 * 60 * 60 * 1000 - Date.now();
  if (diff <= 0) return "SLA breached";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}h ${m}m left`;
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
      backgroundColor: "rgba(46,196,182,0.12)",
      border: "1px solid rgba(46,196,182,0.30)",
      color: "var(--accent-teal)",
    };
  if (tone === "amber")
    return {
      backgroundColor: "rgba(245,158,11,0.12)",
      border: "1px solid rgba(245,158,11,0.30)",
      color: "#f59e0b",
    };
  if (tone === "green")
    return {
      backgroundColor: "rgba(34,197,94,0.12)",
      border: "1px solid rgba(34,197,94,0.30)",
      color: "var(--status-success)",
    };
  if (tone === "red")
    return {
      backgroundColor: "rgba(239,68,68,0.12)",
      border: "1px solid rgba(239,68,68,0.30)",
      color: "#ef4444",
    };
  return {
    backgroundColor: "rgba(100,116,139,0.12)",
    border: "1px solid rgba(100,116,139,0.25)",
    color: "var(--text-secondary)",
  };
}
function Pill({ label, tone }: { label: string; tone: Tone }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={toneStyle(tone)}
    >
      {label}
    </span>
  );
}
function applicationTone(s?: DriverApplicationStatus): Tone {
  if (s === "PENDING") return "amber";
  if (s === "NEEDS_INFO") return "red";
  if (s === "APPROVED") return "green";
  if (s === "REJECTED") return "slate";
  return "slate";
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
      className="inline-flex rounded-xl border p-1 w-full"
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
              "flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold transition",
              active ? "shadow-sm" : "opacity-70 hover:opacity-100",
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
            {typeof opt.count === "number" && (
              <span
                className="inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-bold"
                style={{
                  backgroundColor: "rgba(100,116,139,0.15)",
                  color: "var(--text-secondary)",
                }}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
function SkeletonRow() {
  return (
    <div
      className="px-4 py-3.5 border-b"
      style={{ borderColor: "var(--border-medium)" }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="h-9 w-9 rounded-xl animate-pulse shrink-0"
            style={{ backgroundColor: "var(--bg-tertiary)" }}
          />
          <div className="space-y-1.5">
            <div
              className="h-3.5 w-32 rounded animate-pulse"
              style={{ backgroundColor: "var(--bg-tertiary)" }}
            />
            <div
              className="h-3 w-20 rounded animate-pulse"
              style={{ backgroundColor: "var(--bg-tertiary)" }}
            />
          </div>
        </div>
        <div
          className="h-5 w-16 rounded-full animate-pulse"
          style={{ backgroundColor: "var(--bg-tertiary)" }}
        />
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
  }, [status, vehicleType]); // eslint-disable-line

  const filtered = useMemo(() => {
    const q = debouncedQuery.toLowerCase();
    if (!q) return apps;
    return apps.filter(
      (a) =>
        a.driverName.toLowerCase().includes(q) ||
        a.plateNumber.toLowerCase().includes(q) ||
        a.guarantorName.toLowerCase().includes(q) ||
        a.guarantorPhone.toLowerCase().includes(q),
    );
  }, [apps, debouncedQuery]);

  const counts = useMemo(() => {
    const base = {
      PENDING: 0,
      NEEDS_INFO: 0,
      APPROVED: 0,
      REJECTED: 0,
    } as Record<DriverApplicationStatus, number>;
    for (const a of apps)
      if (a.applicationStatus)
        base[a.applicationStatus] = (base[a.applicationStatus] || 0) + 1;
    return base;
  }, [apps]);

  const breachedCount = useMemo(
    () =>
      filtered.filter((a) => formatSla(a.createdAt) === "SLA breached").length,
    [filtered],
  );

  return (
    <Sidebar>
      <style>{`
        input::placeholder { color: var(--text-secondary); }
        .list-scroll::-webkit-scrollbar { width: 4px; }
        .list-scroll::-webkit-scrollbar-thumb { background: var(--border-medium); border-radius: 99px; }
      `}</style>

      <div className="flex flex-col" style={{ height: "calc(100vh - 2rem)" }}>
        {/* Top bar */}
        <div className="shrink-0 mb-4">
          <div
            className="rounded-2xl border px-5 py-4"
            style={{
              backgroundColor: "var(--bg-secondary)",
              borderColor: "var(--border-medium)",
            }}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1
                  className="text-2xl font-bold header"
                  style={{ color: "var(--text-primary)" }}
                >
                  Driver Applications
                </h1>
                <p
                  className="text-sm mt-0.5"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Review onboarding submissions · {filtered.length} showing
                  {breachedCount > 0 && (
                    <span style={{ color: "#ef4444" }}>
                      {" "}
                      · {breachedCount} SLA breached
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value as any)}
                  className="rounded-xl border px-3 py-2 text-sm bg-transparent outline-none cursor-pointer"
                  style={{
                    borderColor: "var(--border-medium)",
                    color: "var(--text-primary)",
                    backgroundColor: "var(--bg-tertiary)",
                  }}
                >
                  <option value="ALL">All vehicles</option>
                  <option value="VAN">Van</option>
                  <option value="BIKE">Bike</option>
                  <option value="LORRY">Lorry</option>
                  <option value="TRUCK">Truck</option>
                </select>
                <button
                  onClick={load}
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition hover:opacity-80 disabled:opacity-60"
                  style={{
                    backgroundColor: "var(--bg-tertiary)",
                    borderColor: "var(--border-medium)",
                    color: "var(--text-primary)",
                  }}
                >
                  <RefreshCcw
                    className={cn("h-4 w-4", isLoading && "animate-spin")}
                  />
                  Refresh
                </button>
              </div>
            </div>
            {error && (
              <div
                className="mt-3 rounded-xl border px-4 py-3 text-sm"
                style={{
                  backgroundColor: "rgba(239,68,68,0.10)",
                  borderColor: "rgba(239,68,68,0.30)",
                  color: "#ef4444",
                }}
              >
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Split layout */}
        <div className="flex flex-1 gap-4 min-h-0">
          {/* LEFT: List */}
          <div
            className="flex flex-col rounded-2xl border overflow-hidden transition-all duration-300"
            style={{
              width: selected ? "360px" : "100%",
              flexShrink: selected ? 0 : undefined,
              backgroundColor: "var(--bg-secondary)",
              borderColor: "var(--border-medium)",
            }}
          >
            <div
              className="shrink-0 p-3 border-b space-y-2"
              style={{ borderColor: "var(--border-medium)" }}
            >
              <Segmented
                value={status}
                onChange={(v) => {
                  setStatus(v as DriverApplicationStatus);
                  setSelected(null);
                }}
                options={[
                  { value: "PENDING", label: "Pending", count: counts.PENDING },
                  {
                    value: "NEEDS_INFO",
                    label: "Info",
                    count: counts.NEEDS_INFO,
                  },
                  {
                    value: "APPROVED",
                    label: "Approved",
                    count: counts.APPROVED,
                  },
                  {
                    value: "REJECTED",
                    label: "Rejected",
                    count: counts.REJECTED,
                  },
                ]}
              />
              <div
                className="relative rounded-xl border overflow-hidden"
                style={{
                  backgroundColor: "var(--bg-tertiary)",
                  borderColor: "var(--border-medium)",
                }}
              >
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
                  style={{ color: "var(--text-secondary)" }}
                />
                <input
                  type="text"
                  placeholder="Search name, plate, guarantor…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2.5 bg-transparent outline-none text-sm"
                  style={{ color: "var(--text-primary)" }}
                />
                {searchQuery && (
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:opacity-80"
                    style={{ color: "var(--text-secondary)" }}
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto list-scroll">
              {isLoading ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                  <div
                    className="h-14 w-14 rounded-2xl flex items-center justify-center mb-4"
                    style={{
                      backgroundColor: "rgba(100,116,139,0.10)",
                      border: "1px solid var(--border-medium)",
                    }}
                  >
                    <Users
                      className="h-7 w-7"
                      style={{ color: "var(--text-secondary)" }}
                    />
                  </div>
                  <div
                    className="text-sm font-bold mb-1"
                    style={{ color: "var(--text-primary)" }}
                  >
                    No applications found
                  </div>
                  <div
                    className="text-xs mb-4"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Try clearing search or switching filters.
                  </div>
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setVehicleType("ALL");
                    }}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg border transition hover:opacity-80"
                    style={{
                      backgroundColor: "var(--bg-tertiary)",
                      borderColor: "var(--border-medium)",
                      color: "var(--text-primary)",
                    }}
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                filtered.map((a) => {
                  const Icon = vehicleIcon(a.vehicleType);
                  const sla = formatSla(a.createdAt);
                  const isActive = selected?.id === a.id;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() =>
                        setSelected((p) => (p?.id === a.id ? null : a))
                      }
                      className="w-full text-left border-b transition"
                      style={{
                        borderColor: "var(--border-medium)",
                        backgroundColor: isActive
                          ? "rgba(46,196,182,0.08)"
                          : "transparent",
                        borderLeft: isActive
                          ? "3px solid var(--accent-teal)"
                          : "3px solid transparent",
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive)
                          (
                            e.currentTarget as HTMLButtonElement
                          ).style.backgroundColor = "rgba(100,116,139,0.05)";
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive)
                          (
                            e.currentTarget as HTMLButtonElement
                          ).style.backgroundColor = "transparent";
                      }}
                    >
                      <div className="px-4 py-3.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
                              style={{
                                backgroundColor: isActive
                                  ? "rgba(46,196,182,0.15)"
                                  : "rgba(100,116,139,0.10)",
                              }}
                            >
                              <Icon
                                className="h-4 w-4"
                                style={{
                                  color: isActive
                                    ? "var(--accent-teal)"
                                    : "var(--text-secondary)",
                                }}
                              />
                            </div>
                            <div className="min-w-0">
                              <div
                                className="text-sm font-semibold truncate"
                                style={{ color: "var(--text-primary)" }}
                              >
                                {a.driverName}
                              </div>
                              <div
                                className="text-xs truncate mt-0.5"
                                style={{ color: "var(--text-secondary)" }}
                              >
                                {a.plateNumber} · {formatTimestamp(a.createdAt)}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
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
                            {sla === "SLA breached" ? (
                              <span
                                className="text-xs font-semibold"
                                style={{ color: "#ef4444" }}
                              >
                                Breached
                              </span>
                            ) : (
                              <span
                                className="text-xs"
                                style={{ color: "var(--text-secondary)" }}
                              >
                                {sla}
                              </span>
                            )}
                          </div>
                        </div>
                        {!selected && (
                          <div className="mt-2 flex items-center justify-between">
                            <span
                              className="text-xs"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              Guarantor:{" "}
                              <span style={{ color: "var(--text-primary)" }}>
                                {a.guarantorName}
                              </span>{" "}
                              · {a.guarantorPhone}
                            </span>
                            <ChevronRight
                              className="h-3.5 w-3.5 opacity-40"
                              style={{ color: "var(--text-secondary)" }}
                            />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT: Detail or placeholder */}
          {selected ? (
            <div
              className="flex-1 min-w-0 rounded-2xl border overflow-hidden"
              style={{
                backgroundColor: "var(--bg-primary)",
                borderColor: "var(--border-medium)",
              }}
            >
              <DriverApplicationDetail
                app={selected}
                onClose={() => setSelected(null)}
                onUpdated={() => {
                  load();
                  setSelected(null);
                }}
              />
            </div>
          ) : (
            <div
              className="flex-1 rounded-2xl border flex flex-col items-center justify-center text-center px-8"
              style={{
                backgroundColor: "var(--bg-secondary)",
                borderColor: "var(--border-medium)",
                borderStyle: "dashed",
              }}
            >
              <div
                className="h-16 w-16 rounded-2xl flex items-center justify-center mb-4"
                style={{
                  backgroundColor: "rgba(46,196,182,0.08)",
                  border: "1px solid rgba(46,196,182,0.2)",
                }}
              >
                <Users
                  className="h-8 w-8"
                  style={{ color: "var(--accent-teal)" }}
                />
              </div>
              <div
                className="text-base font-bold mb-1"
                style={{ color: "var(--text-primary)" }}
              >
                Select an application
              </div>
              <div
                className="text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                Click any row on the left to review
                <br />
                driver details and take action.
              </div>
            </div>
          )}
        </div>
      </div>
    </Sidebar>
  );
}
