import React, { useEffect, useRef, useState } from "react";
import {
  X,
  Mail,
  Phone,
  MapPin,
  Box,
  Weight,
  Ruler,
  Calendar,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  Truck,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import type {
  Shipment,
  ShipmentStatus,
} from "../../types/shipment";
import {
  SHIPMENT_STATUS_COLORS,
  SHIPMENT_STATUS_LABELS,
  VALID_STATUS_TRANSITIONS,
  formatTimestamp,
} from "../../types/shipment";
import { StatusTimeline } from "./StatusTimeline";
import { CheckpointList } from "./CheckpointList";
import { InternalNotes } from "./InternalNotes";
import { shipmentsApi } from "../../services/shipmentsApi";
import { driversApi } from "../../services/driversApi";
import { getApiErrorMessage } from "../../services/apiClient";
import type { DriverApplication } from "../../types/driver";
import { VEHICLE_TYPE_LABELS } from "../../types/driver";

export interface ShipmentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  shipmentId: string;
  onUpdate?: () => void;
  // Navigation support — pass the full ordered list of IDs visible in the
  // current filtered table so the drawer can step through them.
  allShipmentIds?: string[];
  currentIndex?: number;
  onNavigate?: (id: string) => void;
}

const STATUS_BUTTON_STYLES: Record<
  ShipmentStatus,
  { bg: string; border: string; color: string }
> = {
  PENDING:    { bg: "rgba(255,193,7,0.10)",   border: "rgba(255,193,7,0.30)",   color: "#ffc107" },
  QUOTED:     { bg: "rgba(59,130,246,0.10)",  border: "rgba(59,130,246,0.30)",  color: "#3b82f6" },
  ACCEPTED:   { bg: "rgba(139,92,246,0.10)",  border: "rgba(139,92,246,0.30)",  color: "#8b5cf6" },
  PICKED_UP:  { bg: "rgba(236,72,153,0.10)",  border: "rgba(236,72,153,0.30)",  color: "#ec4899" },
  IN_TRANSIT: { bg: "rgba(46,196,182,0.10)",  border: "rgba(46,196,182,0.30)",  color: "var(--accent-teal)" },
  DELIVERED:  { bg: "rgba(34,197,94,0.10)",   border: "rgba(34,197,94,0.30)",   color: "var(--status-success)" },
  CANCELLED:  { bg: "rgba(239,68,68,0.10)",   border: "rgba(239,68,68,0.30)",   color: "#ef4444" },
};

function InfoRow({
  icon: Icon,
  label,
  value,
  iconColor,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  iconColor?: string;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b last:border-0" style={{ borderColor: "var(--border-soft)" }}>
      <div
        className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
        style={{ backgroundColor: "var(--bg-tertiary)" }}
      >
        <Icon className="h-3.5 w-3.5" style={{ color: iconColor || "var(--accent-teal)" }} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium mb-0.5" style={{ color: "var(--text-secondary)" }}>{label}</div>
        <div className="text-sm font-semibold wrap-break-word" style={{ color: "var(--text-primary)" }}>{value || "—"}</div>
      </div>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div
      className="text-xs font-bold uppercase tracking-widest mb-3 pb-2 border-b"
      style={{ color: "var(--text-secondary)", borderColor: "var(--border-medium)" }}
    >
      {title}
    </div>
  );
}

export const ShipmentDetailsModal: React.FC<ShipmentDetailsModalProps> = ({
  isOpen,
  onClose,
  shipmentId,
  onUpdate,
  allShipmentIds = [],
  currentIndex = -1,
  onNavigate,
}) => {
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [amountInput, setAmountInput] = useState("");
  const [isSavingAmount, setIsSavingAmount] = useState(false);
  const [statusNote, setStatusNote] = useState("");
  const [activeTab, setActiveTab] = useState<"shipment" | "activity">("shipment");

  // Driver assignment state
  const [availableDrivers, setAvailableDrivers] = useState<DriverApplication[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [isAssigningDriver, setIsAssigningDriver] = useState(false);

  const openedAtRef = useRef<number>(0);
  const lastIsOpenRef = useRef<boolean>(false);
  const loadSeqRef = useRef(0);

  if (isOpen && !lastIsOpenRef.current) {
    openedAtRef.current = Date.now();
  }
  lastIsOpenRef.current = isOpen;

  useEffect(() => {
    if (isOpen && shipmentId) {
      setIsVisible(true);
      setShipment(null);
      setStatusNote("");
      setAmountInput("");
      setError("");
      setSuccess("");
      setSelectedDriverId("");
      setActiveTab("shipment");
      loadShipment();
      loadAvailableDrivers();
    } else {
      const t = window.setTimeout(() => setIsVisible(false), 320);
      return () => window.clearTimeout(t);
    }
  }, [isOpen, shipmentId]); // eslint-disable-line

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") handleClose();
      if (e.key === "ArrowLeft" && canGoPrev) handleNav("prev");
      if (e.key === "ArrowRight" && canGoNext) handleNav("next");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, currentIndex, allShipmentIds]); // eslint-disable-line

  const loadShipment = async (opts?: { silent?: boolean }) => {
    const seq = ++loadSeqRef.current;
    if (!opts?.silent) setIsLoading(true);
    setError("");
    try {
      const data = await shipmentsApi.getById(shipmentId);
      if (seq !== loadSeqRef.current) return;
      setShipment(data);
      setAmountInput(
        typeof data.amount === "number" && Number.isFinite(data.amount)
          ? String(data.amount)
          : "",
      );
    } catch (err) {
      if (seq !== loadSeqRef.current) return;
      setError(getApiErrorMessage(err));
    } finally {
      if (!opts?.silent && seq === loadSeqRef.current) setIsLoading(false);
    }
  };

  const loadAvailableDrivers = async () => {
    try {
      const drivers = await driversApi.listAvailable();
      setAvailableDrivers(drivers);
    } catch {
      // non-critical — silently ignore
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(), 300);
  };

  const handleBackdropClick = () => {
    if (Date.now() - openedAtRef.current < 500) return;
    if (isLoading || isUpdatingStatus || isSavingAmount || isAssigningDriver) return;
    handleClose();
  };

  const handleStatusChangeTo = async (nextStatus: ShipmentStatus) => {
    if (!shipment) return;

    if (
      shipment.status === "PENDING" &&
      (!Number.isFinite(shipment.amount) || shipment.amount <= 0)
    ) {
      setError("Please set an amount first so the client can download an invoice.");
      setTimeout(() => setError(""), 4000);
      return;
    }

    const validTransitions = VALID_STATUS_TRANSITIONS[shipment.status] || [];
    if (!validTransitions.includes(nextStatus)) return;

    const previousShipment = shipment;
    const optimisticTimestamp = new Date().toISOString();
    setShipment((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        status: nextStatus,
        statusHistory: [
          ...prev.statusHistory,
          {
            id: `optimistic-${Date.now()}`,
            shipmentId: prev.id,
            status: nextStatus,
            timestamp: optimisticTimestamp,
            note: statusNote || undefined,
          },
        ],
      };
    });

    setIsUpdatingStatus(true);
    setError("");
    try {
      await shipmentsApi.updateStatus(shipment.id, {
        status: nextStatus,
        note: statusNote || undefined,
      });
      setStatusNote("");
      setSuccess(`✓ Status updated to "${SHIPMENT_STATUS_LABELS[nextStatus]}"`);
      setTimeout(() => setSuccess(""), 2500);
      onUpdate?.();
      await loadShipment({ silent: true });
    } catch (err) {
      setShipment(previousShipment);
      setError(getApiErrorMessage(err));
      setTimeout(() => setError(""), 4000);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleSaveAmount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shipment) return;
    const nextAmount = Number(amountInput);
    if (!Number.isFinite(nextAmount) || !Number.isInteger(nextAmount) || nextAmount < 0) {
      setError("Amount must be a whole number (₦) and at least 0.");
      setTimeout(() => setError(""), 3000);
      return;
    }
    if (nextAmount === shipment.amount) return;
    setIsSavingAmount(true);
    setError("");
    try {
      await shipmentsApi.updateAmount(shipment.id, { amount: nextAmount });
      onUpdate?.();
      await loadShipment();
      setSuccess("✓ Amount updated.");
      setTimeout(() => setSuccess(""), 2000);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setTimeout(() => setError(""), 3000);
    } finally {
      setIsSavingAmount(false);
    }
  };

  const handleAssignDriver = async () => {
    if (!shipment || !selectedDriverId) return;
    setIsAssigningDriver(true);
    setError("");
    try {
      await shipmentsApi.assignDriver(shipment.id, { driverId: selectedDriverId });
      setSelectedDriverId("");
      setSuccess("✓ Driver assigned.");
      setTimeout(() => setSuccess(""), 2500);
      onUpdate?.();
      await loadShipment({ silent: true });
    } catch (err) {
      setError(getApiErrorMessage(err));
      setTimeout(() => setError(""), 4000);
    } finally {
      setIsAssigningDriver(false);
    }
  };

  const handleAddCheckpoint = async (location: string, description: string) => {
    if (!shipment) return;
    try {
      await shipmentsApi.addCheckpoint(shipment.id, { location, description });
      await loadShipment();
      setSuccess("✓ Checkpoint added.");
      setTimeout(() => setSuccess(""), 2000);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleAddNote = async (text: string) => {
    if (!shipment) return;
    try {
      await shipmentsApi.addNote(shipment.id, { text });
      await loadShipment();
      setSuccess("✓ Note added.");
      setTimeout(() => setSuccess(""), 2000);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleNav = (dir: "prev" | "next") => {
    if (!onNavigate || allShipmentIds.length === 0 || currentIndex < 0) return;
    const nextIdx = dir === "prev" ? currentIndex - 1 : currentIndex + 1;
    if (nextIdx >= 0 && nextIdx < allShipmentIds.length) {
      onNavigate(allShipmentIds[nextIdx]);
    }
  };

  const canGoPrev = allShipmentIds.length > 0 && currentIndex > 0;
  const canGoNext = allShipmentIds.length > 0 && currentIndex >= 0 && currentIndex < allShipmentIds.length - 1;
  const hasNav = allShipmentIds.length > 0 && currentIndex >= 0;

  if (!isOpen && !isVisible) return null;

  const isBusy = isLoading || isUpdatingStatus || isSavingAmount || isAssigningDriver;
  const statusColors = shipment ? SHIPMENT_STATUS_COLORS[shipment.status] : null;
  const validNextStatuses = shipment ? VALID_STATUS_TRANSITIONS[shipment.status] || [] : [];
  const isAmountSet = shipment ? Number.isFinite(shipment.amount) && shipment.amount > 0 : false;
  const isStatusUpdateBlocked = shipment ? shipment.status === "PENDING" && !isAmountSet : false;
  const activityCount = shipment ? (shipment.notes?.length || 0) + (shipment.checkpoints?.length || 0) : 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 transition-all duration-300"
        style={{
          backgroundColor: isOpen && isVisible ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0)",
          backdropFilter: isOpen && isVisible ? "blur(4px)" : "none",
          pointerEvents: isOpen ? "auto" : "none",
        }}
        onClick={handleBackdropClick}
      />

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 z-50 h-screen flex flex-col shadow-2xl transition-transform duration-300 ease-out"
        style={{
          width: "min(560px, 100vw)",
          backgroundColor: "var(--bg-primary)",
          borderLeft: "1px solid var(--border-medium)",
          transform: isOpen && isVisible ? "translateX(0)" : "translateX(100%)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Teal accent line */}
        <div className="h-0.5 w-full shrink-0" style={{ backgroundColor: "var(--accent-teal)" }} />

        {/* Header */}
        <div
          className="shrink-0 px-5 py-4 border-b"
          style={{ borderColor: "var(--border-medium)", backgroundColor: "var(--bg-secondary)" }}
        >
          {isLoading && !shipment ? (
            <div className="animate-pulse space-y-2">
              <div className="h-5 w-40 rounded" style={{ backgroundColor: "var(--bg-tertiary)" }} />
              <div className="h-3 w-24 rounded" style={{ backgroundColor: "var(--bg-tertiary)" }} />
            </div>
          ) : shipment ? (
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-extrabold tracking-tight" style={{ color: "var(--text-primary)" }}>
                    {shipment.trackingId}
                  </h2>
                  <span
                    className="px-2.5 py-0.5 rounded-full text-xs font-bold border"
                    style={{
                      backgroundColor: statusColors?.bg,
                      color: statusColors?.text,
                      borderColor: statusColors?.border,
                    }}
                  >
                    {SHIPMENT_STATUS_LABELS[shipment.status]}
                  </span>
                </div>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                  {shipment.customer.name} · {shipment.customer.email}
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {hasNav && (
                  <>
                    <button
                      onClick={() => handleNav("prev")}
                      disabled={!canGoPrev || isBusy}
                      title="Previous shipment (←)"
                      className="h-8 w-8 rounded-lg flex items-center justify-center border transition hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed"
                      style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-medium)", color: "var(--text-secondary)" }}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-xs font-semibold tabular-nums" style={{ color: "var(--text-secondary)" }}>
                      {currentIndex + 1}/{allShipmentIds.length}
                    </span>
                    <button
                      onClick={() => handleNav("next")}
                      disabled={!canGoNext || isBusy}
                      title="Next shipment (→)"
                      className="h-8 w-8 rounded-lg flex items-center justify-center border transition hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed"
                      style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-medium)", color: "var(--text-secondary)" }}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </>
                )}
                <button
                  onClick={handleClose}
                  disabled={isBusy}
                  title="Close (Esc)"
                  className="h-8 w-8 rounded-lg flex items-center justify-center border transition hover:opacity-80 disabled:opacity-50"
                  style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-medium)", color: "var(--text-secondary)" }}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : null}

          {/* Tabs */}
          {shipment && (
            <div className="flex gap-1 mt-3 border-b -mb-4 pb-0" style={{ borderColor: "var(--border-medium)" }}>
              {(["shipment", "activity"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="relative pb-3 pr-4 text-xs font-semibold capitalize transition"
                  style={{ color: activeTab === tab ? "var(--text-primary)" : "var(--text-secondary)" }}
                >
                  {tab === "activity" ? `Activity (${activityCount})` : "Shipment"}
                  {activeTab === tab && (
                    <span
                      className="absolute bottom-0 left-0 right-4 h-0.5 rounded-t-full"
                      style={{ backgroundColor: "var(--accent-teal)" }}
                    />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
          {/* Feedback banners */}
          {(error || success) && (
            <div className="px-5 pt-4">
              {error && (
                <div
                  className="rounded-xl border px-4 py-3 text-sm flex items-center gap-2 mb-2"
                  style={{ backgroundColor: "rgba(239,68,68,0.10)", borderColor: "rgba(239,68,68,0.30)", color: "#ef4444" }}
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}
              {success && (
                <div
                  className="rounded-xl border px-4 py-3 text-sm flex items-center gap-2 mb-2"
                  style={{ backgroundColor: "rgba(34,197,94,0.10)", borderColor: "rgba(34,197,94,0.30)", color: "var(--status-success)" }}
                >
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  {success}
                </div>
              )}
            </div>
          )}

          {isLoading && !shipment && (
            <div className="p-5 space-y-4 animate-pulse">
              {[180, 140, 200, 160, 120].map((w, i) => (
                <div key={i} className="h-4 rounded-lg" style={{ width: w, backgroundColor: "var(--bg-tertiary)" }} />
              ))}
            </div>
          )}

          {shipment && activeTab === "shipment" && (
            <div className="px-5 py-4 space-y-5">
              {/* ── Pricing & Amount ── */}
              <div className="rounded-2xl border p-4" style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-medium)" }}>
                <SectionHeader title="Pricing" />
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Current amount</span>
                  <span className="text-base font-extrabold tabular-nums" style={{ color: "var(--text-primary)" }}>
                    ₦{(shipment.amount ?? 0).toLocaleString("en-NG")}
                  </span>
                </div>
                <form onSubmit={handleSaveAmount} className="flex gap-2">
                  <input
                    inputMode="numeric"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="Update amount (₦)"
                    disabled={isSavingAmount}
                    className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ backgroundColor: "var(--bg-primary)", border: "1px solid var(--border-medium)", color: "var(--text-primary)" }}
                  />
                  <button
                    type="submit"
                    disabled={isSavingAmount || Number(amountInput || "0") === shipment.amount}
                    className="px-4 py-2.5 rounded-xl text-sm font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: "var(--text-primary)", color: "var(--text-inverse)" }}
                  >
                    {isSavingAmount ? "Saving…" : "Save"}
                  </button>
                </form>
              </div>

              {/* ── Customer Info ── */}
              <div className="rounded-2xl border p-4" style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-medium)" }}>
                <SectionHeader title="Customer" />
                <InfoRow icon={Mail} label="Email" value={shipment.customer.email} />
                <InfoRow icon={Phone} label="Sender Phone" value={shipment.phone || "—"} />
                {shipment.receiverPhone && (
                  <InfoRow icon={Phone} label="Receiver Phone" value={shipment.receiverPhone} />
                )}
              </div>

              {/* ── Route ── */}
              <div className="rounded-2xl border p-4" style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-medium)" }}>
                <SectionHeader title="Route" />
                <InfoRow icon={MapPin} label="Pickup" value={shipment.pickupLocation} iconColor="#22c55e" />
                <InfoRow icon={MapPin} label="Destination" value={shipment.destinationLocation} iconColor="#3b82f6" />
              </div>

              {/* ── Package ── */}
              <div className="rounded-2xl border p-4" style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-medium)" }}>
                <SectionHeader title="Package" />
                <InfoRow icon={Box} label="Type" value={shipment.packageType} />
                <InfoRow icon={Weight} label="Weight" value={shipment.weight} />
                <InfoRow icon={Ruler} label="Dimensions" value={shipment.dimensions} />
                <InfoRow icon={Calendar} label="Created" value={formatTimestamp(shipment.createdAt)} />
              </div>

              {/* ── Driver Assignment ── */}
              <div className="rounded-2xl border p-4" style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-medium)" }}>
                <SectionHeader title="Driver" />
                {shipment.driverId ? (
                  <div className="flex items-center gap-3">
                    <div
                      className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: "rgba(46,196,182,0.12)", border: "1px solid rgba(46,196,182,0.25)" }}
                    >
                      <Truck className="h-4 w-4" style={{ color: "var(--accent-teal)" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Assigned driver</div>
                      <div className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                        {availableDrivers.find((d) => d.id === shipment.driverId)?.driverName || shipment.driverId}
                      </div>
                    </div>
                    <div
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold"
                      style={{ backgroundColor: "rgba(46,196,182,0.10)", color: "var(--accent-teal)" }}
                    >
                      <UserCheck className="h-3.5 w-3.5" />
                      Assigned
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <UserX className="h-4 w-4" style={{ color: "var(--text-secondary)" }} />
                      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>No driver assigned</span>
                    </div>
                    {availableDrivers.length > 0 ? (
                      <div className="flex gap-2">
                        <select
                          value={selectedDriverId}
                          onChange={(e) => setSelectedDriverId(e.target.value)}
                          disabled={isAssigningDriver}
                          className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none"
                          style={{ backgroundColor: "var(--bg-primary)", border: "1px solid var(--border-medium)", color: "var(--text-primary)" }}
                        >
                          <option value="">Select available driver…</option>
                          {availableDrivers.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.driverName} — {VEHICLE_TYPE_LABELS[d.vehicleType]} ({d.plateNumber})
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={handleAssignDriver}
                          disabled={!selectedDriverId || isAssigningDriver}
                          className="px-4 py-2.5 rounded-xl text-sm font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{ backgroundColor: "rgba(46,196,182,0.14)", border: "1px solid rgba(46,196,182,0.30)", color: "var(--accent-teal)" }}
                        >
                          {isAssigningDriver ? "Assigning…" : "Assign"}
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                        No available drivers right now. Use the Dispatch page to assign.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* ── Status Update ── */}
              <div className="rounded-2xl border p-4" style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-medium)" }}>
                <SectionHeader title="Update Status" />

                {isStatusUpdateBlocked && (
                  <div
                    className="rounded-xl border px-3 py-2.5 text-xs font-semibold flex items-center gap-2 mb-3"
                    style={{ backgroundColor: "rgba(245,158,11,0.10)", borderColor: "rgba(245,158,11,0.30)", color: "#f59e0b" }}
                  >
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    Set an amount above before advancing this shipment.
                  </div>
                )}

                {validNextStatuses.length > 0 ? (
                  <>
                    <textarea
                      value={statusNote}
                      onChange={(e) => setStatusNote(e.target.value)}
                      placeholder="Note for this status change (optional)"
                      rows={2}
                      disabled={isUpdatingStatus || isStatusUpdateBlocked}
                      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none mb-3"
                      style={{ backgroundColor: "var(--bg-primary)", border: "1px solid var(--border-medium)", color: "var(--text-primary)" }}
                    />
                    <div className="flex flex-wrap gap-2">
                      {validNextStatuses.map((nextStatus) => {
                        const s = STATUS_BUTTON_STYLES[nextStatus];
                        return (
                          <button
                            key={nextStatus}
                            onClick={() => handleStatusChangeTo(nextStatus)}
                            disabled={isUpdatingStatus || isStatusUpdateBlocked}
                            className="flex-1 min-w-30 px-4 py-2.5 rounded-xl text-sm font-bold border transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                            style={{ backgroundColor: s.bg, borderColor: s.border, color: s.color }}
                          >
                            {isUpdatingStatus ? "Updating…" : `→ ${SHIPMENT_STATUS_LABELS[nextStatus]}`}
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div
                    className="rounded-xl px-3 py-3 text-sm font-semibold text-center"
                    style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
                  >
                    {shipment.status === "DELIVERED"
                      ? "✓ Shipment delivered — no further status changes."
                      : shipment.status === "CANCELLED"
                        ? "Shipment cancelled."
                        : "No status transitions available."}
                  </div>
                )}
              </div>
            </div>
          )}

          {shipment && activeTab === "activity" && (
            <div className="px-5 py-4 space-y-6">
              <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border-medium)" }}>
                <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border-medium)", backgroundColor: "var(--bg-secondary)" }}>
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>Status Timeline</span>
                </div>
                <div className="p-4" style={{ backgroundColor: "var(--bg-primary)" }}>
                  <StatusTimeline statusHistory={shipment.statusHistory} currentStatus={shipment.status} />
                </div>
              </div>

              <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border-medium)" }}>
                <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border-medium)", backgroundColor: "var(--bg-secondary)" }}>
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>Checkpoints</span>
                </div>
                <div className="p-4" style={{ backgroundColor: "var(--bg-primary)" }}>
                  <CheckpointList
                    checkpoints={shipment.checkpoints}
                    onAddCheckpoint={handleAddCheckpoint}
                    isLoading={isLoading}
                  />
                </div>
              </div>

              <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border-medium)" }}>
                <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border-medium)", backgroundColor: "var(--bg-secondary)" }}>
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>Internal Notes</span>
                </div>
                <div className="p-4" style={{ backgroundColor: "var(--bg-primary)" }}>
                  <InternalNotes
                    notes={shipment.notes}
                    onAddNote={handleAddNote}
                    isLoading={isLoading}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
