import React, { useState } from "react";
import { driversApi } from "../../services/driversApi";
import { getApiErrorMessage, apiClient } from "../../services/apiClient";
import type {
  DriverApplication,
  DriverApplicationStatus,
  VehicleType,
} from "../../types/driver";
import {
  DRIVER_APPLICATION_STATUS_LABELS,
  VEHICLE_TYPE_LABELS,
} from "../../types/driver";
import {
  AlertTriangle,
  Ban,
  Bike,
  Car,
  CheckCircle2,
  ChevronLeft,
  Clock,
  FileText,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Shield,
  Truck,
  User,
  Users,
  Video,
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
  const diff = created + 48 * 60 * 60 * 1000 - Date.now();
  if (diff <= 0) return "SLA breached";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}h ${m}m left`;
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
function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div
      className="flex items-start gap-3 py-3 border-b last:border-0"
      style={{ borderColor: "var(--border-medium)" }}
    >
      <div
        className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
        style={{ backgroundColor: "rgba(46,196,182,0.10)" }}
      >
        <Icon className="h-4 w-4" style={{ color: "var(--accent-teal)" }} />
      </div>
      <div className="min-w-0">
        <div
          className="text-xs font-semibold uppercase tracking-wide mb-0.5"
          style={{ color: "var(--text-secondary)" }}
        >
          {label}
        </div>
        <div
          className="text-sm font-medium break-words"
          style={{ color: "var(--text-primary)" }}
        >
          {value || "—"}
        </div>
      </div>
    </div>
  );
}
function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{
        backgroundColor: "var(--bg-secondary)",
        borderColor: "var(--border-medium)",
      }}
    >
      <div
        className="flex items-center gap-2 px-5 py-4 border-b"
        style={{
          borderColor: "var(--border-medium)",
          backgroundColor: "var(--bg-tertiary)",
        }}
      >
        <Icon className="h-4 w-4" style={{ color: "var(--accent-teal)" }} />
        <span
          className="text-sm font-bold header"
          style={{ color: "var(--text-primary)" }}
        >
          {title}
        </span>
      </div>
      <div className="px-5 py-1">{children}</div>
    </div>
  );
}
function DocCard({
  label,
  path,
  kind,
}: {
  label: string;
  path: string;
  kind: "doc" | "video";
}) {
  const missing = !path;
  const Ico = kind === "video" ? Video : FileText;
  const [loading, setLoading] = useState(false);
  const handleClick = async () => {
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
        "group flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition text-left w-full",
        missing
          ? "opacity-60 cursor-not-allowed"
          : "hover:opacity-90 cursor-pointer",
      )}
      style={{
        backgroundColor: "var(--bg-tertiary)",
        borderColor: "var(--border-medium)",
        color: "var(--text-primary)",
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
          style={{
            backgroundColor: missing
              ? "rgba(100,116,139,0.12)"
              : "rgba(46,196,182,0.12)",
          }}
        >
          <Ico
            className="h-4 w-4"
            style={{
              color: missing ? "var(--text-secondary)" : "var(--accent-teal)",
            }}
          />
        </div>
        <div className="min-w-0">
          <div
            className="text-xs font-semibold truncate"
            style={{ color: "var(--text-primary)" }}
          >
            {label}
          </div>
          <div
            className="text-xs mt-0.5"
            style={{ color: "var(--text-secondary)" }}
          >
            {missing ? "Not uploaded" : loading ? "Opening…" : "Click to view"}
          </div>
        </div>
      </div>
      {loading ? (
        <Loader2
          className="h-4 w-4 animate-spin shrink-0"
          style={{ color: "var(--text-secondary)" }}
        />
      ) : missing ? (
        <AlertTriangle
          className="h-4 w-4 shrink-0"
          style={{ color: "#f59e0b" }}
        />
      ) : (
        <div
          className="h-6 w-6 rounded-md flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100 transition"
          style={{ backgroundColor: "rgba(46,196,182,0.12)" }}
        >
          <ChevronLeft
            className="h-3 w-3 rotate-180"
            style={{ color: "var(--accent-teal)" }}
          />
        </div>
      )}
    </button>
  );
}

interface Props {
  app: DriverApplication;
  onClose: () => void;
  onUpdated: () => void;
}

export default function DriverApplicationDetail({
  app,
  onClose,
  onUpdated,
}: Props) {
  const Icon = vehicleIcon(app.vehicleType);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sla = formatSla(app.createdAt);

  const updateStatus = async (status: DriverApplicationStatus) => {
    if (isWorking) return;
    setIsWorking(true);
    setError(null);
    try {
      await driversApi.updateApplicationStatus(app.id, status);
      onUpdated();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ backgroundColor: "var(--bg-primary)" }}
    >
      {/* Header */}
      <div
        className="shrink-0 border-b px-5 py-4"
        style={{
          borderColor: "var(--border-medium)",
          backgroundColor: "var(--bg-secondary)",
        }}
      >
        <button
          onClick={onClose}
          className="inline-flex items-center gap-1.5 text-xs font-semibold mb-4 hover:opacity-80 transition"
          style={{ color: "var(--text-secondary)" }}
        >
          <ChevronLeft className="h-4 w-4" /> Back to list
        </button>
        <div className="flex items-start gap-4">
          <div
            className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{
              backgroundColor: "rgba(46,196,182,0.15)",
              border: "1px solid rgba(46,196,182,0.25)",
            }}
          >
            <Icon className="h-6 w-6" style={{ color: "var(--accent-teal)" }} />
          </div>
          <div className="min-w-0 flex-1">
            <h2
              className="text-xl font-bold header truncate"
              style={{ color: "var(--text-primary)" }}
            >
              {app.driverName}
            </h2>
            <div
              className="text-xs mt-0.5"
              style={{ color: "var(--text-secondary)" }}
            >
              {VEHICLE_TYPE_LABELS[app.vehicleType]} · {app.plateNumber}
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <Pill
                label={
                  app.applicationStatus
                    ? DRIVER_APPLICATION_STATUS_LABELS[app.applicationStatus]
                    : "Application"
                }
                tone={applicationTone(app.applicationStatus)}
              />
              <Pill
                label={sla}
                tone={sla === "SLA breached" ? "red" : "slate"}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable body */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ scrollbarWidth: "thin" }}
      >
        <div className="px-5 py-5 space-y-4">
          {error && (
            <div
              className="rounded-xl border px-4 py-3 text-sm"
              style={{
                backgroundColor: "rgba(239,68,68,0.10)",
                borderColor: "rgba(239,68,68,0.30)",
                color: "#ef4444",
              }}
            >
              {error}
            </div>
          )}

          {/* Actions */}
          <div
            className="rounded-2xl border p-4"
            style={{
              backgroundColor: "var(--bg-secondary)",
              borderColor: "var(--border-medium)",
            }}
          >
            <div
              className="text-xs font-bold uppercase tracking-wide mb-3"
              style={{ color: "var(--text-secondary)" }}
            >
              Review Decision
            </div>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => updateStatus("APPROVED")}
                disabled={isWorking}
                className="flex items-center justify-center gap-2 w-full rounded-xl px-4 py-3 text-sm font-bold transition active:scale-[0.99] disabled:opacity-60"
                style={{
                  backgroundColor: "rgba(34,197,94,0.12)",
                  border: "1px solid rgba(34,197,94,0.30)",
                  color: "var(--status-success)",
                }}
              >
                <CheckCircle2 className="h-4 w-4" />
                {isWorking ? "Updating…" : "Approve Application"}
              </button>
              <button
                onClick={() => updateStatus("NEEDS_INFO")}
                disabled={isWorking}
                className="flex items-center justify-center gap-2 w-full rounded-xl px-4 py-3 text-sm font-bold transition active:scale-[0.99] disabled:opacity-60"
                style={{
                  backgroundColor: "rgba(245,158,11,0.10)",
                  border: "1px solid rgba(245,158,11,0.30)",
                  color: "#f59e0b",
                }}
              >
                <AlertTriangle className="h-4 w-4" />
                Request More Info
              </button>
              <button
                onClick={() => updateStatus("REJECTED")}
                disabled={isWorking}
                className="flex items-center justify-center gap-2 w-full rounded-xl px-4 py-3 text-sm font-bold transition active:scale-[0.99] disabled:opacity-60"
                style={{
                  backgroundColor: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.25)",
                  color: "#ef4444",
                }}
              >
                <Ban className="h-4 w-4" />
                Reject Application
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 px-1">
            <Clock
              className="h-3.5 w-3.5"
              style={{ color: "var(--text-secondary)" }}
            />
            <span
              className="text-xs"
              style={{ color: "var(--text-secondary)" }}
            >
              Submitted {formatTimestamp(app.createdAt)}
            </span>
          </div>

          <SectionCard title="Driver Information" icon={User}>
            <InfoRow icon={User} label="Full Name" value={app.driverName} />
            <InfoRow icon={Mail} label="Email" value={app.driverEmail} />
            <InfoRow icon={Phone} label="Phone" value={app.driverPhone} />
            <InfoRow icon={MapPin} label="Address" value={app.driverAddress} />
          </SectionCard>

          <SectionCard title="Vehicle Details" icon={Icon}>
            <InfoRow
              icon={Icon}
              label="Type"
              value={VEHICLE_TYPE_LABELS[app.vehicleType]}
            />
            <InfoRow
              icon={Shield}
              label="Plate Number"
              value={app.plateNumber}
            />
          </SectionCard>

          <SectionCard title="Guarantor" icon={Users}>
            <InfoRow icon={User} label="Name" value={app.guarantorName} />
            <InfoRow icon={Phone} label="Phone" value={app.guarantorPhone} />
            <InfoRow
              icon={MapPin}
              label="Address"
              value={app.guarantorAddress}
            />
            <InfoRow icon={Shield} label="NIN" value={app.guarantorNin} />
          </SectionCard>

          <div
            className="rounded-2xl border overflow-hidden"
            style={{
              backgroundColor: "var(--bg-secondary)",
              borderColor: "var(--border-medium)",
            }}
          >
            <div
              className="flex items-center gap-2 px-5 py-4 border-b"
              style={{
                borderColor: "var(--border-medium)",
                backgroundColor: "var(--bg-tertiary)",
              }}
            >
              <FileText
                className="h-4 w-4"
                style={{ color: "var(--accent-teal)" }}
              />
              <span
                className="text-sm font-bold header"
                style={{ color: "var(--text-primary)" }}
              >
                Uploaded Documents
              </span>
            </div>
            <div className="p-4 grid grid-cols-1 gap-2">
              <DocCard
                label="Proof of Ownership"
                path={app.proofOfOwnershipPath}
                kind="doc"
              />
              <DocCard
                label="Vehicle License"
                path={app.vehicleLicensePath}
                kind="doc"
              />
              <DocCard
                label="Hackney Permit"
                path={app.hackneyPermitPath}
                kind="doc"
              />
              <DocCard
                label="Vehicle Insurance"
                path={app.vehicleInsurancePath}
                kind="doc"
              />
              <DocCard
                label="Vehicle Video"
                path={app.vehicleVideoPath}
                kind="video"
              />
              <DocCard
                label="Driver's License"
                path={app.driversLicensePath}
                kind="doc"
              />
              <DocCard
                label="Means of ID"
                path={app.meansOfIdPath}
                kind="doc"
              />
              <DocCard
                label="Driver Face Photo"
                path={app.driverFacePhotoPath}
                kind="doc"
              />
              <DocCard
                label="Driver Full Body Photo"
                path={app.driverFullBodyPhotoPath}
                kind="doc"
              />
              <DocCard
                label="Guarantor ID"
                path={app.guarantorMeansOfIdPath}
                kind="doc"
              />
            </div>
          </div>
          <div className="h-4" />
        </div>
      </div>
    </div>
  );
}
