import { useCallback, useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/sidebar";
import { shipmentsApi } from "../../services/shipmentsApi";
import { driversApi } from "../../services/driversApi";
import { getApiErrorMessage } from "../../services/apiClient";
import type { Shipment } from "../../types/shipment";
import type { DriverApplication, VehicleType } from "../../types/driver";
import { VEHICLE_TYPE_LABELS } from "../../types/driver";
import {
  ArrowRight,
  Bike,
  Car,
  CheckCircle2,
  ChevronRight,
  Clock,
  MapPin,
  Package,
  RefreshCcw,
  Truck,
  Users,
  X,
  Zap,
} from "lucide-react";

function cn(...classes: Array<string | false | null | undefined>) {
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

function formatTimeAgo(ts: string) {
  const d = new Date(ts).getTime();
  if (!Number.isFinite(d)) return "";
  const diff = Date.now() - d;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function vehicleIcon(type: VehicleType) {
  if (type === "VAN") return Car;
  if (type === "BIKE") return Bike;
  return Truck;
}

type VehicleFilter = "ALL" | VehicleType;

function SkeletonCard() {
  return (
    <div
      className="px-4 py-4 border-b"
      style={{ borderColor: "var(--border-medium)" }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-2 flex-1">
          <div
            className="h-3.5 w-36 rounded animate-pulse"
            style={{ backgroundColor: "var(--bg-tertiary)" }}
          />
          <div
            className="h-3 w-48 rounded animate-pulse"
            style={{ backgroundColor: "var(--bg-tertiary)" }}
          />
        </div>
        <div
          className="h-3 w-16 rounded animate-pulse"
          style={{ backgroundColor: "var(--bg-tertiary)" }}
        />
      </div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  sub,
}: {
  icon: React.ElementType;
  title: string;
  sub: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
      <div
        className="h-12 w-12 rounded-2xl flex items-center justify-center mb-3"
        style={{
          backgroundColor: "rgba(100,116,139,0.10)",
          border: "1px solid var(--border-medium)",
        }}
      >
        <Icon className="h-6 w-6" style={{ color: "var(--text-secondary)" }} />
      </div>
      <div
        className="text-sm font-bold mb-1"
        style={{ color: "var(--text-primary)" }}
      >
        {title}
      </div>
      <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
        {sub}
      </div>
    </div>
  );
}

// Step pill shown at top to guide user
function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
  const steps = [
    { n: 1, label: "Pick shipment" },
    { n: 2, label: "Pick driver" },
    { n: 3, label: "Confirm" },
  ];
  return (
    <div className="flex items-center gap-1">
      {steps.map((s, i) => {
        const done = step > s.n;
        const active = step === s.n;
        return (
          <div key={s.n} className="flex items-center gap-1">
            <div
              className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all"
              style={{
                backgroundColor: done
                  ? "rgba(34,197,94,0.12)"
                  : active
                    ? "rgba(46,196,182,0.15)"
                    : "rgba(100,116,139,0.10)",
                border: done
                  ? "1px solid rgba(34,197,94,0.3)"
                  : active
                    ? "1px solid rgba(46,196,182,0.35)"
                    : "1px solid transparent",
                color: done
                  ? "var(--status-success)"
                  : active
                    ? "var(--accent-teal)"
                    : "var(--text-secondary)",
              }}
            >
              {done ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <span
                  className="h-3.5 w-3.5 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{
                    backgroundColor: active
                      ? "var(--accent-teal)"
                      : "var(--bg-tertiary)",
                    color: active
                      ? "var(--bg-primary)"
                      : "var(--text-secondary)",
                  }}
                >
                  {s.n}
                </span>
              )}
              {s.label}
            </div>
            {i < steps.length - 1 && (
              <ChevronRight
                className="h-3.5 w-3.5 opacity-30"
                style={{ color: "var(--text-secondary)" }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function DriversDispatch() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [drivers, setDrivers] = useState<DriverApplication[]>([]);

  const [shipmentsLoading, setShipmentsLoading] = useState(false);
  const [driversLoading, setDriversLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [assignedSuccess, setAssignedSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [vehicleType, setVehicleType] = useState<VehicleFilter>("ALL");
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(
    null,
  );
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);

  const unassigned = useMemo(
    () =>
      shipments
        .filter((s) => !s.driverId)
        .slice()
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))),
    [shipments],
  );

  const selectedShipment = useMemo(
    () => unassigned.find((s) => s.id === selectedShipmentId) || null,
    [unassigned, selectedShipmentId],
  );

  const selectedShipmentVehicleType = (selectedShipment as any)?.vehicleType as
    | VehicleType
    | undefined;

  const visibleDrivers = useMemo(() => {
    if (vehicleType !== "ALL")
      return drivers.filter((d) => d.vehicleType === vehicleType);
    if (selectedShipmentVehicleType)
      return drivers.filter(
        (d) => d.vehicleType === selectedShipmentVehicleType,
      );
    return drivers;
  }, [drivers, vehicleType, selectedShipmentVehicleType]);

  const selectedDriver = useMemo(
    () => visibleDrivers.find((d) => d.id === selectedDriverId) || null,
    [visibleDrivers, selectedDriverId],
  );

  // Derive current wizard step
  const step: 1 | 2 | 3 = !selectedShipment ? 1 : !selectedDriver ? 2 : 3;

  const load = useCallback(async () => {
    setError(null);
    setShipmentsLoading(true);
    setDriversLoading(true);
    try {
      const driverFilter =
        vehicleType === "ALL"
          ? undefined
          : { vehicleType: vehicleType as VehicleType };
      const [allShipments, availableDrivers] = await Promise.all([
        shipmentsApi.list(),
        driversApi.listAvailable(driverFilter),
      ]);
      setShipments(allShipments);
      setDrivers(availableDrivers);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setShipmentsLoading(false);
      setDriversLoading(false);
    }
  }, [vehicleType]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (
      selectedShipmentId &&
      !unassigned.some((s) => s.id === selectedShipmentId)
    ) {
      setSelectedShipmentId(null);
    }
  }, [unassigned, selectedShipmentId]);

  useEffect(() => {
    if (
      selectedDriverId &&
      !visibleDrivers.some((d) => d.id === selectedDriverId)
    ) {
      setSelectedDriverId(null);
    }
  }, [visibleDrivers, selectedDriverId]);

  useEffect(() => {
    setSelectedDriverId(null);
  }, [vehicleType]);

  const canAssign = Boolean(selectedShipment && selectedDriver) && !assigning;

  const assign = useCallback(async () => {
    if (!selectedShipmentId || !selectedDriverId || assigning) return;
    setAssigning(true);
    setError(null);
    setAssignedSuccess(null);
    try {
      await shipmentsApi.assignDriver(selectedShipmentId, {
        driverId: selectedDriverId,
      });
      const label = `${selectedShipment?.trackingId} → ${selectedDriver?.driverName}`;
      setAssignedSuccess(label);
      setSelectedShipmentId(null);
      setSelectedDriverId(null);
      await load();
      setTimeout(() => setAssignedSuccess(null), 4000);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setAssigning(false);
    }
  }, [
    assigning,
    load,
    selectedDriverId,
    selectedShipmentId,
    selectedShipment,
    selectedDriver,
  ]);

  const isLoading = shipmentsLoading || driversLoading;

  return (
    <Sidebar>
      <style>{`
        .dispatch-scroll::-webkit-scrollbar { width: 4px; }
        .dispatch-scroll::-webkit-scrollbar-thumb { background: var(--border-medium); border-radius: 99px; }
        .dispatch-scroll::-webkit-scrollbar-track { background: transparent; }
      `}</style>

      <div className="flex flex-col" style={{ height: "calc(100vh - 2rem)" }}>
        {/* ── Header bar ── */}
        <div className="shrink-0 mb-4">
          <div
            className="rounded-2xl border px-5 py-4"
            style={{
              backgroundColor: "var(--bg-secondary)",
              borderColor: "var(--border-medium)",
            }}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2.5 mb-1">
                  <div
                    className="h-9 w-9 rounded-xl flex items-center justify-center"
                    style={{
                      backgroundColor: "rgba(46,196,182,0.12)",
                      border: "1px solid rgba(46,196,182,0.25)",
                    }}
                  >
                    <Zap
                      className="h-5 w-5"
                      style={{ color: "var(--accent-teal)" }}
                    />
                  </div>
                  <h1
                    className="text-2xl font-bold header"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Dispatch Console
                  </h1>
                </div>
                <p
                  className="text-sm pl-0.5"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {unassigned.length} unassigned shipment
                  {unassigned.length !== 1 ? "s" : ""} · {visibleDrivers.length}{" "}
                  driver{visibleDrivers.length !== 1 ? "s" : ""} available
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <StepIndicator step={step} />

                <div className="flex items-center gap-2 ml-2">
                  {/* Vehicle filter */}
                  <select
                    value={vehicleType}
                    onChange={(e) =>
                      setVehicleType(e.target.value as VehicleFilter)
                    }
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
            </div>
          </div>
        </div>

        {/* ── Toast banners ── */}
        {assignedSuccess && (
          <div
            className="shrink-0 mb-3 rounded-xl border px-4 py-3 flex items-center justify-between gap-3 text-sm font-semibold"
            style={{
              backgroundColor: "rgba(34,197,94,0.10)",
              borderColor: "rgba(34,197,94,0.30)",
              color: "var(--status-success)",
            }}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Assigned: {assignedSuccess}
            </div>
            <button onClick={() => setAssignedSuccess(null)}>
              <X className="h-4 w-4 opacity-60 hover:opacity-100" />
            </button>
          </div>
        )}
        {error && (
          <div
            className="shrink-0 mb-3 rounded-xl border px-4 py-3 flex items-center justify-between gap-3 text-sm"
            style={{
              backgroundColor: "rgba(239,68,68,0.10)",
              borderColor: "rgba(239,68,68,0.30)",
              color: "#ef4444",
            }}
          >
            {error}
            <button onClick={() => setError(null)}>
              <X className="h-4 w-4 opacity-60 hover:opacity-100" />
            </button>
          </div>
        )}

        {/* ── Three-column layout ── */}
        <div className="flex flex-1 gap-4 min-h-0">
          {/* ── COL 1: Unassigned Shipments ── */}
          <div
            className="flex flex-col rounded-2xl border overflow-hidden flex-1 min-w-0"
            style={{
              backgroundColor: "var(--bg-secondary)",
              borderColor: "var(--border-medium)",
            }}
          >
            {/* Column header */}
            <div
              className="shrink-0 px-5 py-4 border-b"
              style={{
                borderColor: "var(--border-medium)",
                backgroundColor: "var(--bg-tertiary)",
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package
                    className="h-4 w-4"
                    style={{ color: "var(--accent-teal)" }}
                  />
                  <span
                    className="text-sm font-bold header"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Shipments
                  </span>
                  {!shipmentsLoading && (
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold"
                      style={{
                        backgroundColor: "rgba(100,116,139,0.15)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {unassigned.length}
                    </span>
                  )}
                </div>
                {selectedShipment && (
                  <button
                    onClick={() => {
                      setSelectedShipmentId(null);
                      setSelectedDriverId(null);
                    }}
                    className="text-xs font-semibold flex items-center gap-1 hover:opacity-80 transition"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    <X className="h-3.5 w-3.5" /> Clear
                  </button>
                )}
              </div>
              <p
                className="text-xs mt-1"
                style={{ color: "var(--text-secondary)" }}
              >
                Select one to dispatch
              </p>
            </div>

            {/* Shipment list */}
            <div className="flex-1 overflow-y-auto dispatch-scroll">
              {shipmentsLoading ? (
                <>
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                </>
              ) : unassigned.length === 0 ? (
                <EmptyState
                  icon={Package}
                  title="All clear"
                  sub="No unassigned shipments right now."
                />
              ) : (
                unassigned.map((s) => {
                  const isActive = selectedShipmentId === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setSelectedShipmentId(s.id);
                        setSelectedDriverId(null);
                      }}
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
                      <div className="px-4 py-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className="text-sm font-bold truncate"
                                style={{ color: "var(--text-primary)" }}
                              >
                                {s.trackingId}
                              </span>
                              <span
                                className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0"
                                style={{
                                  backgroundColor: "rgba(245,158,11,0.12)",
                                  border: "1px solid rgba(245,158,11,0.25)",
                                  color: "#f59e0b",
                                }}
                              >
                                {s.status}
                              </span>
                            </div>
                            <div
                              className="flex items-start gap-1 text-xs"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                              <span className="truncate">
                                {s.pickupLocation}
                              </span>
                            </div>
                            <div
                              className="flex items-center gap-1 text-xs mt-0.5"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              <ArrowRight className="h-3 w-3 shrink-0" />
                              <span className="truncate">
                                {s.destinationLocation}
                              </span>
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <div
                              className="flex items-center gap-1 text-xs justify-end"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              <Clock className="h-3 w-3" />
                              {formatTimeAgo(String(s.createdAt))}
                            </div>
                            {isActive && (
                              <div className="mt-1">
                                <CheckCircle2
                                  className="h-4 w-4 ml-auto"
                                  style={{ color: "var(--accent-teal)" }}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* ── COL 2: Available Drivers ── */}
          <div
            className="flex flex-col rounded-2xl border overflow-hidden flex-1 min-w-0"
            style={{
              backgroundColor: "var(--bg-secondary)",
              borderColor: "var(--border-medium)",
              opacity: !selectedShipment ? 0.6 : 1,
              transition: "opacity 0.2s",
            }}
          >
            <div
              className="shrink-0 px-5 py-4 border-b"
              style={{
                borderColor: "var(--border-medium)",
                backgroundColor: "var(--bg-tertiary)",
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users
                    className="h-4 w-4"
                    style={{ color: "var(--accent-teal)" }}
                  />
                  <span
                    className="text-sm font-bold header"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Drivers
                  </span>
                  {!driversLoading && (
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold"
                      style={{
                        backgroundColor: "rgba(100,116,139,0.15)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {visibleDrivers.length}
                    </span>
                  )}
                </div>
                {selectedDriver && (
                  <button
                    onClick={() => setSelectedDriverId(null)}
                    className="text-xs font-semibold flex items-center gap-1 hover:opacity-80 transition"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    <X className="h-3.5 w-3.5" /> Clear
                  </button>
                )}
              </div>
              <p
                className="text-xs mt-1"
                style={{ color: "var(--text-secondary)" }}
              >
                {selectedShipment
                  ? "Choose a driver for this shipment"
                  : "Select a shipment first"}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto dispatch-scroll">
              {driversLoading ? (
                <>
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                </>
              ) : visibleDrivers.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No drivers"
                  sub="No available drivers for the current filter."
                />
              ) : (
                visibleDrivers.map((d) => {
                  const Icon = vehicleIcon(d.vehicleType);
                  const isActive = selectedDriverId === d.id;
                  const disabled = !selectedShipment;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => setSelectedDriverId(d.id)}
                      className={cn(
                        "w-full text-left border-b transition",
                        disabled && "cursor-not-allowed",
                      )}
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
                        if (!isActive && !disabled)
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
                      <div className="px-4 py-4">
                        <div className="flex items-center justify-between gap-3">
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
                                {d.driverName}
                              </div>
                              <div
                                className="text-xs mt-0.5"
                                style={{ color: "var(--text-secondary)" }}
                              >
                                {VEHICLE_TYPE_LABELS[d.vehicleType]} ·{" "}
                                {d.plateNumber}
                              </div>
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            {isActive ? (
                              <CheckCircle2
                                className="h-4 w-4"
                                style={{ color: "var(--accent-teal)" }}
                              />
                            ) : (
                              <div
                                className="text-xs"
                                style={{ color: "var(--text-secondary)" }}
                              >
                                {formatTimeAgo(String(d.updatedAt))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* ── COL 3: Confirm Assignment ── */}
          <div
            className="flex flex-col rounded-2xl border overflow-hidden w-72 shrink-0"
            style={{
              backgroundColor: "var(--bg-secondary)",
              borderColor: "var(--border-medium)",
            }}
          >
            <div
              className="shrink-0 px-5 py-4 border-b"
              style={{
                borderColor: "var(--border-medium)",
                backgroundColor: "var(--bg-tertiary)",
              }}
            >
              <div className="flex items-center gap-2">
                <Zap
                  className="h-4 w-4"
                  style={{ color: "var(--accent-teal)" }}
                />
                <span
                  className="text-sm font-bold header"
                  style={{ color: "var(--text-primary)" }}
                >
                  Confirm
                </span>
              </div>
              <p
                className="text-xs mt-1"
                style={{ color: "var(--text-secondary)" }}
              >
                Review and dispatch
              </p>
            </div>

            <div className="flex-1 p-4 flex flex-col gap-3">
              {/* Shipment summary card */}
              <div
                className="rounded-xl border p-3"
                style={{
                  backgroundColor: selectedShipment
                    ? "rgba(46,196,182,0.06)"
                    : "var(--bg-tertiary)",
                  borderColor: selectedShipment
                    ? "rgba(46,196,182,0.25)"
                    : "var(--border-medium)",
                  transition: "all 0.2s",
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Package
                    className="h-3.5 w-3.5"
                    style={{
                      color: selectedShipment
                        ? "var(--accent-teal)"
                        : "var(--text-secondary)",
                    }}
                  />
                  <span
                    className="text-xs font-bold uppercase tracking-wide"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Shipment
                  </span>
                </div>
                {selectedShipment ? (
                  <>
                    <div
                      className="text-sm font-bold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {selectedShipment.trackingId}
                    </div>
                    <div
                      className="text-xs mt-1 space-y-0.5"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                          {selectedShipment.pickupLocation}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ArrowRight className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                          {selectedShipment.destinationLocation}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div
                    className="text-xs"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Not selected yet
                  </div>
                )}
              </div>

              {/* Arrow connector */}
              <div className="flex justify-center">
                <div
                  className="h-6 w-6 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: canAssign
                      ? "rgba(46,196,182,0.12)"
                      : "var(--bg-tertiary)",
                    border: "1px solid var(--border-medium)",
                  }}
                >
                  <ArrowRight
                    className="h-3.5 w-3.5 rotate-90"
                    style={{
                      color: canAssign
                        ? "var(--accent-teal)"
                        : "var(--text-secondary)",
                    }}
                  />
                </div>
              </div>

              {/* Driver summary card */}
              <div
                className="rounded-xl border p-3"
                style={{
                  backgroundColor: selectedDriver
                    ? "rgba(46,196,182,0.06)"
                    : "var(--bg-tertiary)",
                  borderColor: selectedDriver
                    ? "rgba(46,196,182,0.25)"
                    : "var(--border-medium)",
                  transition: "all 0.2s",
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Users
                    className="h-3.5 w-3.5"
                    style={{
                      color: selectedDriver
                        ? "var(--accent-teal)"
                        : "var(--text-secondary)",
                    }}
                  />
                  <span
                    className="text-xs font-bold uppercase tracking-wide"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Driver
                  </span>
                </div>
                {selectedDriver ? (
                  <>
                    <div
                      className="text-sm font-bold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {selectedDriver.driverName}
                    </div>
                    <div
                      className="text-xs mt-1"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {VEHICLE_TYPE_LABELS[selectedDriver.vehicleType]} ·{" "}
                      {selectedDriver.plateNumber}
                    </div>
                  </>
                ) : (
                  <div
                    className="text-xs"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Not selected yet
                  </div>
                )}
              </div>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Action buttons */}
              <div className="space-y-2">
                <button
                  onClick={assign}
                  disabled={!canAssign}
                  className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: canAssign
                      ? "rgba(46,196,182,0.15)"
                      : "var(--bg-tertiary)",
                    border: canAssign
                      ? "1px solid rgba(46,196,182,0.35)"
                      : "1px solid var(--border-medium)",
                    color: canAssign
                      ? "var(--accent-teal)"
                      : "var(--text-secondary)",
                  }}
                >
                  {assigning ? (
                    <>
                      <RefreshCcw className="h-4 w-4 animate-spin" />
                      Assigning…
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4" />
                      Dispatch Now
                    </>
                  )}
                </button>

                {(selectedShipment || selectedDriver) && (
                  <button
                    onClick={() => {
                      setSelectedShipmentId(null);
                      setSelectedDriverId(null);
                    }}
                    disabled={assigning}
                    className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition hover:opacity-80 disabled:opacity-50"
                    style={{
                      backgroundColor: "var(--bg-tertiary)",
                      border: "1px solid var(--border-medium)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    <X className="h-4 w-4" />
                    Clear selection
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Sidebar>
  );
}
