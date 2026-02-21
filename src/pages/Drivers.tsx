import { useEffect, useMemo, useState } from "react";
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
  Bike,
  Car,
  FileText,
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

function applicationTone(status?: DriverApplicationStatus) {
  if (status === "PENDING") return "amber" as const;
  if (status === "NEEDS_INFO") return "red" as const;
  if (status === "APPROVED") return "green" as const;
  if (status === "REJECTED") return "slate" as const;
  return "slate" as const;
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

  const docLink = (label: string, path: string, kind: "doc" | "video") => {
    const url = buildFileUrl(path);
    const Ico = kind === "video" ? Video : FileText;
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
            <Ico className="h-5 w-5" style={{ color: "var(--accent-teal)" }} />
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
                </div>
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

          <div className="px-6 py-6 space-y-8">
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

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Pill
                  label={
                    app.applicationStatus
                      ? DRIVER_APPLICATION_STATUS_LABELS[app.applicationStatus]
                      : "Application"
                  }
                  tone={applicationTone(app.applicationStatus)}
                />
                <Pill
                  label={formatSla(app.createdAt)}
                  tone={
                    formatSla(app.createdAt) === "SLA breached"
                      ? "red"
                      : "slate"
                  }
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  disabled={isWorking}
                  onClick={() => updateStatus("APPROVED")}
                  className="px-4 py-2 rounded-lg border text-sm font-semibold transition"
                  style={{
                    opacity: isWorking ? 0.6 : 1,
                    backgroundColor: "rgba(34, 197, 94, 0.12)",
                    borderColor: "rgba(34, 197, 94, 0.30)",
                    color: "var(--status-success)",
                  }}
                >
                  {isWorking ? "Updating..." : "Approve"}
                </button>
                <button
                  disabled={isWorking}
                  onClick={() => updateStatus("NEEDS_INFO")}
                  className="px-4 py-2 rounded-lg border text-sm font-semibold transition"
                  style={{
                    opacity: isWorking ? 0.6 : 1,
                    backgroundColor: "rgba(239, 68, 68, 0.10)",
                    borderColor: "rgba(239, 68, 68, 0.30)",
                    color: "#ef4444",
                  }}
                >
                  Needs info
                </button>
                <button
                  disabled={isWorking}
                  onClick={() => updateStatus("REJECTED")}
                  className="px-4 py-2 rounded-lg border text-sm font-semibold transition hover:opacity-90"
                  style={{
                    opacity: isWorking ? 0.6 : 1,
                    backgroundColor: "var(--bg-secondary)",
                    borderColor: "var(--border-medium)",
                    color: "var(--text-primary)",
                  }}
                >
                  Reject
                </button>
              </div>
            </div>

            {/* Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div
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
                  Vehicle
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <Pill
                    label={VEHICLE_TYPE_LABELS[app.vehicleType]}
                    tone="teal"
                  />
                </div>
              </div>
              <div
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
                  Plate
                </div>
                <div
                  className="mt-1 text-sm font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {app.plateNumber}
                </div>
              </div>
              <div
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
                  Guarantor
                </div>
                <div
                  className="mt-1 text-sm font-semibold truncate"
                  style={{ color: "var(--text-primary)" }}
                >
                  {app.guarantorName}
                </div>
                <div
                  className="text-xs"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {app.guarantorPhone}
                </div>
              </div>
            </div>

            {/* Driver */}
            <div>
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
            </div>

            {/* Guarantor */}
            <div>
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
            </div>

            {/* Files */}
            <div>
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
                {docLink("Proof of ownership", app.proofOfOwnershipPath, "doc")}
                {docLink("Vehicle license", app.vehicleLicensePath, "doc")}
                {docLink("Hackney permit", app.hackneyPermitPath, "doc")}
                {docLink("Vehicle insurance", app.vehicleInsurancePath, "doc")}
                {docLink("Vehicle video", app.vehicleVideoPath, "video")}
                {docLink("Driver's license", app.driversLicensePath, "doc")}
                {docLink("Means of ID", app.meansOfIdPath, "doc")}
                {docLink("Driver face photo", app.driverFacePhotoPath, "doc")}
                {docLink(
                  "Driver full body photo",
                  app.driverFullBodyPhotoPath,
                  "doc",
                )}
                {docLink("Guarantor ID", app.guarantorMeansOfIdPath, "doc")}
              </div>

              <div
                className="mt-4 text-xs"
                style={{ color: "var(--text-secondary)" }}
              >
                Tip: Files open in a new tab.
              </div>
            </div>
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
  const [selected, setSelected] = useState<DriverApplication | null>(null);

  const [status, setStatus] = useState<DriverApplicationStatus>("PENDING");
  const [vehicleType, setVehicleType] = useState<"ALL" | VehicleType>("ALL");

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

  const stats = useMemo(() => {
    const total = apps.length;
    const vans = apps.filter((a) => a.vehicleType === "VAN").length;
    const bikes = apps.filter((a) => a.vehicleType === "BIKE").length;
    return { total, vans, bikes };
  }, [apps]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return apps;
    return apps.filter((a) => {
      return (
        a.driverName.toLowerCase().includes(q) ||
        a.plateNumber.toLowerCase().includes(q) ||
        a.guarantorName.toLowerCase().includes(q) ||
        a.guarantorPhone.toLowerCase().includes(q)
      );
    });
  }, [apps, searchQuery]);

  return (
    <Sidebar>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1
            className="text-3xl font-bold header"
            style={{ color: "var(--text-primary)" }}
          >
            Driver Applications
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Review new driver onboarding submissions. Click a row to open
            details.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { title: "Total", value: stats.total, icon: Users },
            { title: "Vans", value: stats.vans, icon: Car },
            { title: "Bikes", value: stats.bikes, icon: Bike },
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
                      {card.value}
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
              </div>
            );
          })}
        </div>

        {/* Search */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                "PENDING",
                "NEEDS_INFO",
                "APPROVED",
                "REJECTED",
              ] as DriverApplicationStatus[]
            ).map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className="px-4 py-2 rounded-lg border text-sm font-semibold transition"
                style={{
                  backgroundColor:
                    status === s ? "var(--bg-tertiary)" : "var(--bg-secondary)",
                  borderColor: "var(--border-medium)",
                  color:
                    status === s
                      ? "var(--text-primary)"
                      : "var(--text-secondary)",
                }}
              >
                {DRIVER_APPLICATION_STATUS_LABELS[s]}
              </button>
            ))}
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
        </div>

        <div
          className="relative rounded-lg border overflow-hidden"
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
            placeholder="Search by driver name, plate number, guarantor name, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-transparent outline-none"
            style={{ color: "var(--text-primary)" }}
          />
          <style>{`input::placeholder { color: var(--text-secondary); }`}</style>
        </div>

        {/* Content */}
        <div className="space-y-4">
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
                    <th className="px-5 py-4 text-left">Guarantor</th>
                    <th className="px-5 py-4 text-left">Submitted</th>
                    <th className="px-5 py-4 text-left">SLA</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-10 text-center text-sm"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Loading applications...
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-10 text-center text-sm"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        No applications found.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((a) => {
                      const Icon = vehicleIcon(a.vehicleType);
                      const sla = formatSla(a.createdAt);
                      return (
                        <tr
                          key={a.id}
                          className={cn(
                            "border-t cursor-pointer transition",
                            true,
                          )}
                          style={{ borderColor: "var(--border-medium)" }}
                          onClick={() => setSelected(a)}
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
                              {a.driverName}
                            </div>
                            <div
                              className="text-xs"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              {a.driverAddress}
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
                            <span
                              className="text-sm"
                              style={{
                                color:
                                  sla === "SLA breached"
                                    ? "#ef4444"
                                    : "var(--text-secondary)",
                                fontWeight: sla === "SLA breached" ? 700 : 400,
                              }}
                            >
                              {sla}
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

          <div className="flex justify-end">
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
