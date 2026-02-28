import { useCallback, useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/sidebar";
import { shipmentsApi } from "../../services/shipmentsApi";
import { driversApi } from "../../services/driversApi";
import { getApiErrorMessage } from "../../services/apiClient";
import type { Shipment } from "../../types/shipment";
import type { DriverApplication, VehicleType } from "../../types/driver";
import { VEHICLE_TYPE_LABELS } from "../../types/driver";
import {
  Bike,
  Car,
  CheckCircle2,
  Package,
  RefreshCcw,
  Truck,
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

function vehicleIcon(type: VehicleType) {
  if (type === "VAN") return Car;
  if (type === "BIKE") return Bike;
  return Truck;
}

type VehicleFilter = "ALL" | VehicleType;

const styles = {
  card: {
    backgroundColor: "var(--bg-secondary)",
    borderColor: "var(--border-medium)",
  } as React.CSSProperties,
  title: { color: "var(--text-primary)" } as React.CSSProperties,
  sub: { color: "var(--text-secondary)" } as React.CSSProperties,
  accent: { color: "var(--accent-teal)" } as React.CSSProperties,
};

export default function DriversDispatch() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [drivers, setDrivers] = useState<DriverApplication[]>([]);

  const [shipmentsLoading, setShipmentsLoading] = useState(false);
  const [driversLoading, setDriversLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [vehicleType, setVehicleType] = useState<VehicleFilter>("ALL");
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(
    null,
  );
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);

  const unassigned = useMemo(() => {
    return shipments
      .filter((s) => !s.driverId)
      .slice()
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }, [shipments]);

  const selectedShipment = useMemo(
    () => unassigned.find((s) => s.id === selectedShipmentId) || null,
    [unassigned, selectedShipmentId],
  );

  // Optional improvement: if shipments have a vehicleType requirement, filter drivers to match the selected shipment.
  // If your Shipment type doesn't have this field, this just falls back safely.
  const selectedShipmentVehicleType = (selectedShipment as any)?.vehicleType as
    | VehicleType
    | undefined;

  const visibleDrivers = useMemo(() => {
    // If admin picked a filter (Bike/Van) — use it.
    if (vehicleType !== "ALL")
      return drivers.filter((d) => d.vehicleType === vehicleType);

    // If no filter selected, but shipment requires a vehicle type — narrow drivers to match.
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

  // Keep selections valid (avoid stale IDs after refresh/filter change)
  useEffect(() => {
    if (
      selectedShipmentId &&
      !unassigned.some((s) => s.id === selectedShipmentId)
    ) {
      setSelectedShipmentId(null);
    }
    // if shipment changes, driver selection should reset (prevents accidental mismatch)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unassigned]);

  useEffect(() => {
    if (
      selectedDriverId &&
      !visibleDrivers.some((d) => d.id === selectedDriverId)
    ) {
      setSelectedDriverId(null);
    }
  }, [visibleDrivers, selectedDriverId]);

  // If vehicle filter changes, it's safer to clear selected driver (the list changes)
  useEffect(() => {
    setSelectedDriverId(null);
  }, [vehicleType]);

  const canAssign = Boolean(selectedShipment && selectedDriver) && !assigning;

  const assign = useCallback(async () => {
    if (!selectedShipmentId || !selectedDriverId) return;
    if (assigning) return;

    setAssigning(true);
    setError(null);

    try {
      await shipmentsApi.assignDriver(selectedShipmentId, {
        driverId: selectedDriverId,
      });

      // Optimistic clear
      setSelectedShipmentId(null);
      setSelectedDriverId(null);

      await load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setAssigning(false);
    }
  }, [assigning, load, selectedDriverId, selectedShipmentId]);

  const clearSelection = () => {
    setSelectedShipmentId(null);
    setSelectedDriverId(null);
  };

  return (
    <Sidebar>
      <div className="space-y-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold header" style={styles.title}>
            Dispatch
          </h1>
          <p className="text-sm" style={styles.sub}>
            Manually assign unassigned shipments to available drivers.
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
          <div className="rounded-lg border px-3 py-2" style={styles.card}>
            <label className="text-xs font-semibold" style={styles.sub}>
              Driver vehicle
            </label>
            <div className="mt-1">
              <select
                value={vehicleType}
                onChange={(e) =>
                  setVehicleType(e.target.value as VehicleFilter)
                }
                className="bg-transparent outline-none text-sm"
                style={styles.title}
              >
                <option value="ALL">All</option>
                <option value="VAN">Van</option>
                <option value="BIKE">Bike</option>
                <option value="LORRY">Lorry</option>
                <option value="TRUCK">Truck</option>
              </select>
            </div>
          </div>

          <button
            onClick={load}
            className="px-4 py-2 rounded-lg border text-sm font-semibold transition hover:opacity-90 inline-flex items-center gap-2"
            style={styles.card}
            disabled={shipmentsLoading || driversLoading}
          >
            <RefreshCcw
              className={cn(
                "h-4 w-4",
                shipmentsLoading || driversLoading ? "animate-spin" : "",
              )}
            />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Shipments */}
          <div
            className="rounded-xl border overflow-hidden"
            style={styles.card}
          >
            <div
              className="px-5 py-4 border-b"
              style={{ borderColor: "var(--border-medium)" }}
            >
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5" style={styles.accent} />
                <div className="text-sm font-bold header" style={styles.title}>
                  Unassigned shipments
                </div>
              </div>
              <div className="text-xs mt-1" style={styles.sub}>
                Select a shipment to assign.
              </div>
            </div>

            <div className="max-h-130 overflow-auto">
              {shipmentsLoading ? (
                <div className="px-5 py-8 text-sm" style={styles.sub}>
                  Loading shipments...
                </div>
              ) : unassigned.length === 0 ? (
                <div className="px-5 py-8 text-sm" style={styles.sub}>
                  No unassigned shipments.
                </div>
              ) : (
                <div
                  className="divide-y"
                  style={{ borderColor: "var(--border-medium)" }}
                >
                  {unassigned.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setSelectedShipmentId(s.id);
                        setSelectedDriverId(null); // reset driver when switching shipment
                      }}
                      className={cn("w-full text-left px-5 py-4 transition")}
                      style={{
                        backgroundColor:
                          selectedShipmentId === s.id
                            ? "rgba(34, 197, 94, 0.12)"
                            : "transparent",
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div
                            className="text-sm font-semibold truncate"
                            style={styles.title}
                          >
                            {s.trackingId}
                          </div>
                          <div className="text-xs" style={styles.sub}>
                            {s.pickupLocation} → {s.destinationLocation}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-xs" style={styles.sub}>
                            {formatTimestamp(String(s.createdAt))}
                          </div>
                          <div
                            className="text-xs font-semibold"
                            style={styles.sub}
                          >
                            {s.status}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Drivers */}
          <div
            className="rounded-xl border overflow-hidden"
            style={styles.card}
          >
            <div
              className="px-5 py-4 border-b"
              style={{ borderColor: "var(--border-medium)" }}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" style={styles.accent} />
                <div className="text-sm font-bold header" style={styles.title}>
                  Available drivers
                </div>
              </div>
              <div className="text-xs mt-1" style={styles.sub}>
                {selectedShipment
                  ? "Select a driver to assign to the chosen shipment."
                  : "Pick a shipment first, then choose a driver."}
              </div>
            </div>

            <div className="max-h-130 overflow-auto">
              {driversLoading ? (
                <div className="px-5 py-8 text-sm" style={styles.sub}>
                  Loading drivers...
                </div>
              ) : visibleDrivers.length === 0 ? (
                <div className="px-5 py-8 text-sm" style={styles.sub}>
                  No available drivers.
                </div>
              ) : (
                <div
                  className="divide-y"
                  style={{ borderColor: "var(--border-medium)" }}
                >
                  {visibleDrivers.map((d) => {
                    const Icon = vehicleIcon(d.vehicleType);
                    const disabled = !selectedShipment; // prevents random driver selection before shipment
                    return (
                      <button
                        key={d.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => setSelectedDriverId(d.id)}
                        className={cn(
                          "w-full text-left px-5 py-4 transition",
                          disabled && "opacity-60 cursor-not-allowed",
                        )}
                        style={{
                          backgroundColor:
                            selectedDriverId === d.id
                              ? "rgba(34, 197, 94, 0.12)"
                              : "transparent",
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <div
                                className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                                style={{
                                  backgroundColor: "rgba(46, 196, 182, 0.12)",
                                }}
                              >
                                <Icon
                                  className="h-4 w-4"
                                  style={styles.accent}
                                />
                              </div>
                              <div className="min-w-0">
                                <div
                                  className="text-sm font-semibold truncate"
                                  style={styles.title}
                                >
                                  {d.driverName}
                                </div>
                                <div className="text-xs" style={styles.sub}>
                                  {VEHICLE_TYPE_LABELS[d.vehicleType]} ·{" "}
                                  {d.plateNumber}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <div className="text-xs" style={styles.sub}>
                              Updated {formatTimestamp(String(d.updatedAt))}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Confirmation */}
        <div className="rounded-xl border p-5" style={styles.card}>
          <div className="text-sm font-bold header" style={styles.title}>
            Confirm assignment
          </div>

          <div className="mt-2 text-sm" style={styles.sub}>
            {selectedShipment && selectedDriver ? (
              <>
                Assign{" "}
                <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>
                  {selectedShipment.trackingId}
                </span>{" "}
                to{" "}
                <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>
                  {selectedDriver.driverName}
                </span>{" "}
                ({VEHICLE_TYPE_LABELS[selectedDriver.vehicleType]}).
              </>
            ) : (
              <>Select a shipment and a driver to continue.</>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              disabled={!canAssign}
              onClick={assign}
              className="px-4 py-2 rounded-lg border text-sm font-semibold transition"
              style={{
                opacity: !canAssign ? 0.6 : 1,
                backgroundColor: "rgba(46, 196, 182, 0.12)",
                borderColor: "rgba(46, 196, 182, 0.30)",
                color: "var(--accent-teal)",
              }}
            >
              {assigning ? "Assigning..." : "Confirm assignment"}
            </button>

            <button
              disabled={assigning}
              onClick={clearSelection}
              className="px-4 py-2 rounded-lg border text-sm font-semibold transition hover:opacity-90"
              style={{
                opacity: assigning ? 0.6 : 1,
                backgroundColor: "var(--bg-secondary)",
                borderColor: "var(--border-medium)",
                color: "var(--text-primary)",
              }}
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    </Sidebar>
  );
}
