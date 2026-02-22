import { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import Sidebar from "../../components/sidebar";
import { driversApi } from "../../services/driversApi";
import { getApiErrorMessage } from "../../services/apiClient";
import type { DriverApplication } from "../../types/driver";
import {
  DRIVER_APPLICATION_STATUS_LABELS,
  DRIVER_STATUS_LABELS,
  VEHICLE_TYPE_LABELS,
} from "../../types/driver";
import { ClipboardList, IdCard, Users } from "lucide-react";

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

function Pill({
  label,
  tone,
}: {
  label: string;
  tone: "teal" | "slate" | "amber" | "green" | "red";
}) {
  const style: React.CSSProperties =
    tone === "teal"
      ? {
          backgroundColor: "rgba(46, 196, 182, 0.12)",
          border: "1px solid rgba(46, 196, 182, 0.30)",
          color: "var(--accent-teal)",
        }
      : tone === "amber"
        ? {
            backgroundColor: "rgba(245, 158, 11, 0.12)",
            border: "1px solid rgba(245, 158, 11, 0.30)",
            color: "#f59e0b",
          }
        : tone === "green"
          ? {
              backgroundColor: "rgba(34, 197, 94, 0.12)",
              border: "1px solid rgba(34, 197, 94, 0.30)",
              color: "var(--status-success)",
            }
          : tone === "red"
            ? {
                backgroundColor: "rgba(239, 68, 68, 0.12)",
                border: "1px solid rgba(239, 68, 68, 0.30)",
                color: "#ef4444",
              }
            : {
                backgroundColor: "rgba(100, 116, 139, 0.12)",
                border: "1px solid rgba(100, 116, 139, 0.25)",
                color: "var(--text-secondary)",
              };

  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
      style={style}
    >
      {label}
    </span>
  );
}

function appTone(app: DriverApplication) {
  const s = app.applicationStatus;
  if (s === "PENDING") return "amber" as const;
  if (s === "NEEDS_INFO") return "red" as const;
  if (s === "APPROVED") return "green" as const;
  if (s === "REJECTED") return "slate" as const;
  return "slate" as const;
}

export default function DriversOverview() {
  const [apps, setApps] = useState<DriverApplication[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await driversApi.listApplications();
      setApps(data);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const byStatus = {
      PENDING: 0,
      NEEDS_INFO: 0,
      APPROVED: 0,
      REJECTED: 0,
    };

    let available = 0;
    let approved = 0;

    for (const a of apps) {
      const s = a.applicationStatus;
      if (s && s in byStatus) (byStatus as any)[s]++;
      if (a.applicationStatus === "APPROVED") {
        approved++;
        if (a.status === "AVAILABLE") available++;
      }
    }

    return {
      ...byStatus,
      approved,
      available,
      total: apps.length,
    };
  }, [apps]);

  const newestPending = useMemo(() => {
    return apps
      .filter((a) => a.applicationStatus === "PENDING")
      .slice()
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .slice(0, 6);
  }, [apps]);

  const needsAttention = useMemo(() => {
    return apps
      .filter(
        (a) => a.applicationStatus === "NEEDS_INFO" || a.status === "SUSPENDED",
      )
      .slice()
      .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
      .slice(0, 6);
  }, [apps]);

  return (
    <Sidebar>
      <div className="space-y-8">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h1
              className="text-3xl font-bold header"
              style={{ color: "var(--text-primary)" }}
            >
              Drivers
            </h1>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Overview of applications, driver availability, and attention
              items.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <NavLink
              to="/drivers/applications"
              className="px-4 py-2 rounded-lg border text-sm font-semibold transition hover:opacity-90"
              style={{
                backgroundColor: "var(--bg-secondary)",
                borderColor: "var(--border-medium)",
                color: "var(--text-primary)",
              }}
            >
              Open applications
            </NavLink>
            <button
              onClick={load}
              className="px-4 py-2 rounded-lg border text-sm font-semibold transition hover:opacity-90"
              style={{
                backgroundColor: "var(--bg-secondary)",
                borderColor: "var(--border-medium)",
                color: "var(--text-primary)",
              }}
            >
              Refresh
            </button>
          </div>
        </div>

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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              title: "Pending",
              value: stats.PENDING,
              icon: ClipboardList,
              tone: "amber" as const,
            },
            {
              title: "Needs info",
              value: stats.NEEDS_INFO,
              icon: Users,
              tone: "red" as const,
            },
            {
              title: "Approved",
              value: stats.APPROVED,
              icon: IdCard,
              tone: "green" as const,
            },
            {
              title: "Available",
              value: stats.available,
              icon: IdCard,
              tone: "teal" as const,
            },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="p-6 rounded-xl border"
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  borderColor: "var(--border-medium)",
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p
                      className="text-sm font-medium header"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {card.title}
                    </p>
                    <p
                      className="text-2xl font-bold mt-2"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {isLoading ? "—" : card.value}
                    </p>
                  </div>
                  <div
                    className="h-12 w-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: "rgba(46, 196, 182, 0.12)" }}
                  >
                    <Icon
                      className="h-6 w-6"
                      style={{ color: "var(--accent-teal)" }}
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <Pill label={`${card.title}`} tone={card.tone} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div
            className="rounded-xl border overflow-hidden"
            style={{
              backgroundColor: "var(--bg-secondary)",
              borderColor: "var(--border-medium)",
            }}
          >
            <div
              className="px-5 py-4 border-b flex items-center justify-between"
              style={{ borderColor: "var(--border-medium)" }}
            >
              <div>
                <div
                  className="text-sm font-bold header"
                  style={{ color: "var(--text-primary)" }}
                >
                  Newest pending applications
                </div>
                <div
                  className="text-xs"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Quick glance at what needs review.
                </div>
              </div>
              <NavLink
                to="/drivers/applications"
                className="text-sm font-semibold hover:opacity-90"
                style={{ color: "var(--accent-teal)" }}
              >
                View all →
              </NavLink>
            </div>

            <div
              className="divide-y"
              style={{ borderColor: "var(--border-medium)" }}
            >
              {newestPending.length === 0 ? (
                <div
                  className="px-5 py-6 text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  No pending applications.
                </div>
              ) : (
                newestPending.map((a) => (
                  <div key={a.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div
                          className="text-sm font-semibold truncate"
                          style={{ color: "var(--text-primary)" }}
                          title={a.driverName}
                        >
                          {a.driverName}
                        </div>
                        <div
                          className="text-xs truncate"
                          style={{ color: "var(--text-secondary)" }}
                          title={a.driverAddress}
                        >
                          {VEHICLE_TYPE_LABELS[a.vehicleType]} · {a.plateNumber}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <Pill
                          label={
                            a.applicationStatus
                              ? DRIVER_APPLICATION_STATUS_LABELS[
                                  a.applicationStatus
                                ]
                              : "Application"
                          }
                          tone={appTone(a)}
                        />
                        <div
                          className="mt-1 text-xs"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {formatTimestamp(a.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div
            className="rounded-xl border overflow-hidden"
            style={{
              backgroundColor: "var(--bg-secondary)",
              borderColor: "var(--border-medium)",
            }}
          >
            <div
              className="px-5 py-4 border-b flex items-center justify-between"
              style={{ borderColor: "var(--border-medium)" }}
            >
              <div>
                <div
                  className="text-sm font-bold header"
                  style={{ color: "var(--text-primary)" }}
                >
                  Drivers needing attention
                </div>
                <div
                  className="text-xs"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Needs info applications or suspended drivers.
                </div>
              </div>
              <NavLink
                to="/drivers/directory"
                className="text-sm font-semibold hover:opacity-90"
                style={{ color: "var(--accent-teal)" }}
              >
                Open directory →
              </NavLink>
            </div>

            <div
              className="divide-y"
              style={{ borderColor: "var(--border-medium)" }}
            >
              {needsAttention.length === 0 ? (
                <div
                  className="px-5 py-6 text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  No drivers need attention.
                </div>
              ) : (
                needsAttention.map((a) => (
                  <div key={a.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div
                          className="text-sm font-semibold truncate"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {a.driverName}
                        </div>
                        <div
                          className="text-xs truncate"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {VEHICLE_TYPE_LABELS[a.vehicleType]} · {a.plateNumber}
                        </div>
                      </div>
                      <div className={cn("shrink-0", true)}>
                        {a.applicationStatus ? (
                          <Pill
                            label={
                              DRIVER_APPLICATION_STATUS_LABELS[
                                a.applicationStatus
                              ]
                            }
                            tone={appTone(a)}
                          />
                        ) : null}
                        {a.status ? (
                          <div className="mt-2">
                            <Pill
                              label={DRIVER_STATUS_LABELS[a.status]}
                              tone={a.status === "SUSPENDED" ? "red" : "slate"}
                            />
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </Sidebar>
  );
}
