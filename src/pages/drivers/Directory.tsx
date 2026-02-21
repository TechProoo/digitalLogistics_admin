import { useEffect, useMemo, useState } from "react";
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
import { Bike, Car, FileText, Search, Shield, X } from "lucide-react";

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
  return type === "VAN" ? Car : Bike;
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

function statusTone(status?: DriverStatus):
  | "teal"
  | "slate"
  | "amber"
  | "green"
  | "red" {
  if (status === "AVAILABLE") return "teal";
  if (status === "BUSY") return "amber";
  if (status === "SUSPENDED") return "red";
  return "slate";
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

  const docLink = (label: string, path: string) => {
    const url = buildFileUrl(path);
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition hover:opacity-95"
        style={{
          backgroundColor: "var(--bg-secondary)",
          borderColor: "var(--border-medium)",
          color: "var(--text-primary)",
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: "rgba(46, 196, 182, 0.12)" }}
          >
            <FileText className="h-5 w-5" style={{ color: "var(--accent-teal)" }} />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{label}</div>
            <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Open file
            </div>
          </div>
        </div>
        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
          View →
        </span>
      </a>
    );
  };

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

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0"
        style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
        onClick={onClose}
      />

      <div className="absolute inset-0 flex items-start justify-center p-4 sm:p-8 overflow-auto">
        <div
          className="w-full max-w-3xl rounded-2xl border shadow-xl"
          style={{
            backgroundColor: "var(--bg-primary)",
            borderColor: "var(--border-medium)",
          }}
        >
          <div
            className="flex items-start justify-between gap-4 px-6 py-5 border-b"
            style={{ borderColor: "var(--border-medium)" }}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div
                  className="h-10 w-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: "rgba(46, 196, 182, 0.12)" }}
                >
                  <Icon className="h-5 w-5" style={{ color: "var(--accent-teal)" }} />
                </div>
                <div className="min-w-0">
                  <div
                    className="text-lg font-bold header truncate"
                    style={{ color: "var(--text-primary)" }}
                    title={app.driverName}
                  >
                    {app.driverName}
                  </div>
                  <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    {VEHICLE_TYPE_LABELS[app.vehicleType]} · {app.plateNumber}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {app.applicationStatus ? (
                  <Pill
                    label={DRIVER_APPLICATION_STATUS_LABELS[app.applicationStatus as DriverApplicationStatus]}
                    tone={app.applicationStatus === "APPROVED" ? "green" : app.applicationStatus === "NEEDS_INFO" ? "red" : "slate"}
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
              onClick={onClose}
              className="p-2 rounded-lg border transition hover:opacity-90"
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

            <div className="flex flex-wrap items-center gap-2">
              <button
                disabled={isWorking}
                onClick={() => setDriverStatus("AVAILABLE")}
                className="px-4 py-2 rounded-lg border text-sm font-semibold transition"
                style={{
                  opacity: isWorking ? 0.6 : 1,
                  backgroundColor: "rgba(46, 196, 182, 0.12)",
                  borderColor: "rgba(46, 196, 182, 0.30)",
                  color: "var(--accent-teal)",
                }}
              >
                Set Available
              </button>
              <button
                disabled={isWorking}
                onClick={() => setDriverStatus("OFFLINE")}
                className="px-4 py-2 rounded-lg border text-sm font-semibold transition hover:opacity-90"
                style={{
                  opacity: isWorking ? 0.6 : 1,
                  backgroundColor: "var(--bg-secondary)",
                  borderColor: "var(--border-medium)",
                  color: "var(--text-primary)",
                }}
              >
                Set Offline
              </button>
              <button
                disabled={isWorking}
                onClick={() => setDriverStatus("SUSPENDED")}
                className="px-4 py-2 rounded-lg border text-sm font-semibold transition"
                style={{
                  opacity: isWorking ? 0.6 : 1,
                  backgroundColor: "rgba(239, 68, 68, 0.10)",
                  borderColor: "rgba(239, 68, 68, 0.30)",
                  color: "#ef4444",
                }}
              >
                Suspend
              </button>
              <button
                disabled={isWorking}
                onClick={requestDocs}
                className="px-4 py-2 rounded-lg border text-sm font-semibold transition hover:opacity-90"
                style={{
                  opacity: isWorking ? 0.6 : 1,
                  backgroundColor: "var(--bg-secondary)",
                  borderColor: "var(--border-medium)",
                  color: "var(--text-primary)",
                }}
              >
                Request doc update
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {docLink("Proof of ownership", app.proofOfOwnershipPath)}
              {docLink("Vehicle license", app.vehicleLicensePath)}
              {docLink("Hackney permit", app.hackneyPermitPath)}
              {docLink("Vehicle insurance", app.vehicleInsurancePath)}
              {docLink("Vehicle video", app.vehicleVideoPath)}
              {docLink("Driver's license", app.driversLicensePath)}
              {docLink("Means of ID", app.meansOfIdPath)}
              {docLink("Driver face photo", app.driverFacePhotoPath)}
              {docLink("Driver full body photo", app.driverFullBodyPhotoPath)}
              {docLink("Guarantor ID", app.guarantorMeansOfIdPath)}
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
  const [status, setStatus] = useState<"ALL" | DriverStatus>("ALL");
  const [selected, setSelected] = useState<DriverApplication | null>(null);

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
    const q = searchQuery.trim().toLowerCase();
    if (!q) return drivers;
    return drivers.filter((d) => {
      return (
        d.driverName.toLowerCase().includes(q) ||
        d.plateNumber.toLowerCase().includes(q) ||
        d.guarantorName.toLowerCase().includes(q) ||
        d.guarantorPhone.toLowerCase().includes(q)
      );
    });
  }, [drivers, searchQuery]);

  return (
    <Sidebar>
      <div className="space-y-8">
        <div className="flex flex-col gap-2">
          <h1
            className="text-3xl font-bold header"
            style={{ color: "var(--text-primary)" }}
          >
            Directory
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Approved drivers and their current availability.
          </p>
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

        <div className="flex flex-wrap items-center gap-3">
          <div
            className="relative rounded-lg border overflow-hidden flex-1 min-w-65"
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
              placeholder="Search by name, plate, guarantor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-transparent outline-none"
              style={{ color: "var(--text-primary)" }}
            />
            <style>{`input::placeholder { color: var(--text-secondary); }`}</style>
          </div>

          <div
            className="rounded-lg border px-3 py-2"
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
              Status
            </label>
            <div className="mt-1">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="bg-transparent outline-none text-sm"
                style={{ color: "var(--text-primary)" }}
              >
                <option value="ALL">All</option>
                <option value="AVAILABLE">Available</option>
                <option value="BUSY">Busy</option>
                <option value="OFFLINE">Offline</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>
          </div>

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

        <div
          className="rounded-xl border overflow-hidden"
          style={{
            backgroundColor: "var(--bg-secondary)",
            borderColor: "var(--border-medium)",
          }}
        >
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr
                  className="text-xs font-semibold uppercase tracking-wider"
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
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-10 text-center text-sm"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Loading drivers...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-10 text-center text-sm"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      No drivers found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((d) => {
                    const Icon = vehicleIcon(d.vehicleType);
                    return (
                      <tr
                        key={d.id}
                        className={cn("border-t cursor-pointer transition", true)}
                        style={{ borderColor: "var(--border-medium)" }}
                        onClick={() => setSelected(d)}
                        onMouseEnter={(e) => {
                          (e.currentTarget as any).style.backgroundColor =
                            "rgba(46,196,182,0.06)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as any).style.backgroundColor =
                            "transparent";
                        }}
                      >
                        <td className="px-5 py-4">
                          <div
                            className="font-semibold"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {d.driverName}
                          </div>
                          <div
                            className="text-xs"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            {d.driverAddress}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-8 w-8 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: "rgba(46, 196, 182, 0.12)" }}
                            >
                              <Icon className="h-4 w-4" style={{ color: "var(--accent-teal)" }} />
                            </div>
                            <Pill label={VEHICLE_TYPE_LABELS[d.vehicleType]} tone="teal" />
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
                          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
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

        <div
          className="rounded-xl border p-4"
          style={{
            backgroundColor: "var(--bg-secondary)",
            borderColor: "var(--border-medium)",
          }}
        >
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" style={{ color: "var(--accent-teal)" }} />
            <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Tip: Open a profile to Suspend/Activate or request document updates.
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
