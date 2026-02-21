import { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/sidebar";
import { shipmentsApi } from "../../services/shipmentsApi";
import { driversApi } from "../../services/driversApi";
import { getApiErrorMessage } from "../../services/apiClient";
import type { Shipment } from "../../types/shipment";
import type { DriverApplication, VehicleType } from "../../types/driver";
import { VEHICLE_TYPE_LABELS } from "../../types/driver";
import { Bike, Car, CheckCircle2, Package, RefreshCcw } from "lucide-react";

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

function vehicleIcon(type: VehicleType) {
  return type === "VAN" ? Car : Bike;
}

export default function DriversDispatch() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [drivers, setDrivers] = useState<DriverApplication[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [vehicleType, setVehicleType] = useState<"ALL" | VehicleType>("ALL");
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(
    null,
  );
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  const load = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [allShipments, availableDrivers] = await Promise.all([
        shipmentsApi.list(),
        driversApi.listAvailable(
          vehicleType === "ALL" ? undefined : { vehicleType },
        ),
      ]);

      setShipments(allShipments);
      setDrivers(availableDrivers);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleType]);

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

  const selectedDriver = useMemo(
    () => drivers.find((d) => d.id === selectedDriverId) || null,
    [drivers, selectedDriverId],
  );

  const assign = async () => {
    if (!selectedShipmentId || !selectedDriverId) return;
    if (isAssigning) return;

    setIsAssigning(true);
    setError(null);

    try {
      await shipmentsApi.assignDriver(selectedShipmentId, {
        driverId: selectedDriverId,
      });

      setSelectedShipmentId(null);
      setSelectedDriverId(null);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <Sidebar>
      <div className="space-y-8">
        <div className="flex flex-col gap-2">
          <h1
            className="text-3xl font-bold header"
            style={{ color: "var(--text-primary)" }}
          >
            Dispatch
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
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
          <div
            className="rounded-lg border px-3 py-2"
            style={{
              backgroundColor: "var(--bg-secondary)",
              borderColor: "var(--border-medium)",
              color: "var(--text-primary)",
            }}
          >
            <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
              Driver vehicle
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

          <button
            onClick={load}
            className="px-4 py-2 rounded-lg border text-sm font-semibold transition hover:opacity-90 inline-flex items-center gap-2"
            style={{
              backgroundColor: "var(--bg-secondary)",
              borderColor: "var(--border-medium)",
              color: "var(--text-primary)",
            }}
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Shipments */}
          <div
            className="rounded-xl border overflow-hidden"
            style={{
              backgroundColor: "var(--bg-secondary)",
              borderColor: "var(--border-medium)",
            }}
          >
            <div
              className="px-5 py-4 border-b"
              style={{ borderColor: "var(--border-medium)" }}
            >
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5" style={{ color: "var(--accent-teal)" }} />
                <div
                  className="text-sm font-bold header"
                  style={{ color: "var(--text-primary)" }}
                >
                  Unassigned shipments
                </div>
              </div>
              <div className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                Select a shipment to assign.
              </div>
            </div>

            <div className="max-h-[520px] overflow-auto">
              {isLoading ? (
                <div className="px-5 py-8 text-sm" style={{ color: "var(--text-secondary)" }}>
                  Loading shipments...
                </div>
              ) : unassigned.length === 0 ? (
                <div className="px-5 py-8 text-sm" style={{ color: "var(--text-secondary)" }}>
                  No unassigned shipments.
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: "var(--border-medium)" }}>
                  {unassigned.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedShipmentId(s.id)}
                      className={cn(
                        "w-full text-left px-5 py-4 transition",
                        selectedShipmentId === s.id && "bg-muted/50",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div
                            className="text-sm font-semibold truncate"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {s.trackingId}
                          </div>
                          <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
                            {s.pickupLocation} → {s.destinationLocation}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
                            {formatTimestamp(s.createdAt)}
                          </div>
                          <div
                            className="text-xs font-semibold"
                            style={{ color: "var(--text-secondary)" }}
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
            style={{
              backgroundColor: "var(--bg-secondary)",
              borderColor: "var(--border-medium)",
            }}
          >
            <div
              className="px-5 py-4 border-b"
              style={{ borderColor: "var(--border-medium)" }}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" style={{ color: "var(--accent-teal)" }} />
                <div
                  className="text-sm font-bold header"
                  style={{ color: "var(--text-primary)" }}
                >
                  Available drivers
                </div>
              </div>
              <div className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                Showing drivers with status AVAILABLE.
              </div>
            </div>

            <div className="max-h-[520px] overflow-auto">
              {isLoading ? (
                <div className="px-5 py-8 text-sm" style={{ color: "var(--text-secondary)" }}>
                  Loading drivers...
                </div>
              ) : drivers.length === 0 ? (
                <div className="px-5 py-8 text-sm" style={{ color: "var(--text-secondary)" }}>
                  No available drivers.
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: "var(--border-medium)" }}>
                  {drivers.map((d) => {
                    const Icon = vehicleIcon(d.vehicleType);
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setSelectedDriverId(d.id)}
                        className={cn(
                          "w-full text-left px-5 py-4 transition",
                          selectedDriverId === d.id && "bg-muted/50",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <div
                                className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                                style={{ backgroundColor: "rgba(46, 196, 182, 0.12)" }}
                              >
                                <Icon className="h-4 w-4" style={{ color: "var(--accent-teal)" }} />
                              </div>
                              <div className="min-w-0">
                                <div
                                  className="text-sm font-semibold truncate"
                                  style={{ color: "var(--text-primary)" }}
                                >
                                  {d.driverName}
                                </div>
                                <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
                                  {VEHICLE_TYPE_LABELS[d.vehicleType]} · {d.plateNumber}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
                              Updated {formatTimestamp(d.updatedAt)}
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
        <div
          className="rounded-xl border p-5"
          style={{
            backgroundColor: "var(--bg-secondary)",
            borderColor: "var(--border-medium)",
          }}
        >
          <div
            className="text-sm font-bold header"
            style={{ color: "var(--text-primary)" }}
          >
            Confirm assignment
          </div>
          <div className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
            {selectedShipment && selectedDriver ? (
              <>
                Assign <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{selectedShipment.trackingId}</span> to{" "}
                <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{selectedDriver.driverName}</span> ({VEHICLE_TYPE_LABELS[selectedDriver.vehicleType]}).
              </>
            ) : (
              <>Select a shipment and a driver to continue.</>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              disabled={!selectedShipment || !selectedDriver || isAssigning}
              onClick={assign}
              className="px-4 py-2 rounded-lg border text-sm font-semibold transition"
              style={{
                opacity: !selectedShipment || !selectedDriver || isAssigning ? 0.6 : 1,
                backgroundColor: "rgba(46, 196, 182, 0.12)",
                borderColor: "rgba(46, 196, 182, 0.30)",
                color: "var(--accent-teal)",
              }}
            >
              {isAssigning ? "Assigning..." : "Confirm assignment"}
            </button>

            <button
              disabled={isAssigning}
              onClick={() => {
                setSelectedShipmentId(null);
                setSelectedDriverId(null);
              }}
              className="px-4 py-2 rounded-lg border text-sm font-semibold transition hover:opacity-90"
              style={{
                opacity: isAssigning ? 0.6 : 1,
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
