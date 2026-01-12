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
  Edit2,
  Save,
} from "lucide-react";
import type {
  Shipment,
  ShipmentDetailsModalProps,
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
import { getApiErrorMessage } from "../../services/apiClient";

export const ShipmentDetailsModal: React.FC<ShipmentDetailsModalProps> = ({
  isOpen,
  onClose,
  shipmentId,
  onUpdate,
}) => {
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<ShipmentStatus | "">("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);
  const [amountInput, setAmountInput] = useState("");
  const [isSavingAmount, setIsSavingAmount] = useState(false);
  const openedAtRef = useRef<number>(0);
  const lastIsOpenRef = useRef<boolean>(false);
  const [isBackdropEnabled, setIsBackdropEnabled] = useState(false);
  const backdropEnableTimerRef = useRef<number | null>(null);
  const closeResetTimerRef = useRef<number | null>(null);

  // Set the "opened" timestamp synchronously to avoid click-through closing
  // the modal before effects run.
  if (isOpen && !lastIsOpenRef.current) {
    openedAtRef.current = Date.now();
  }
  lastIsOpenRef.current = isOpen;

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isLoading) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, isLoading]);

  // Handle animation and loading
  useEffect(() => {
    // Clear any pending timers so stale close timers can't hide a newly opened modal.
    if (backdropEnableTimerRef.current !== null) {
      window.clearTimeout(backdropEnableTimerRef.current);
      backdropEnableTimerRef.current = null;
    }
    if (closeResetTimerRef.current !== null) {
      window.clearTimeout(closeResetTimerRef.current);
      closeResetTimerRef.current = null;
    }

    if (isOpen && shipmentId) {
      setIsAnimating(true);
      setIsBackdropEnabled(false);
      backdropEnableTimerRef.current = window.setTimeout(
        () => setIsBackdropEnabled(true),
        600
      );
      loadShipment();
    } else {
      setIsBackdropEnabled(false);
      closeResetTimerRef.current = window.setTimeout(() => {
        setIsAnimating(false);
        setIsEditMode(false);
        setError("");
        setSuccess("");
      }, 300);
    }

    return () => {
      if (backdropEnableTimerRef.current !== null) {
        window.clearTimeout(backdropEnableTimerRef.current);
        backdropEnableTimerRef.current = null;
      }
      if (closeResetTimerRef.current !== null) {
        window.clearTimeout(closeResetTimerRef.current);
        closeResetTimerRef.current = null;
      }
    };
  }, [isOpen, shipmentId]);

  const loadShipment = async () => {
    setIsLoading(true);
    setError("");
    try {
      const shipmentData = await shipmentsApi.getById(shipmentId);
      setShipment(shipmentData);
      setSelectedStatus(shipmentData.status);
      setAmountInput(
        typeof shipmentData.amount === "number" && Number.isFinite(shipmentData.amount)
          ? String(shipmentData.amount)
          : ""
      );
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAmount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shipment) return;

    const nextAmount = Number(amountInput);
    if (!Number.isFinite(nextAmount) || !Number.isInteger(nextAmount) || nextAmount < 0) {
      setError("Amount must be a whole number (₦) and at least 0");
      setTimeout(() => setError(""), 3000);
      return;
    }

    if (nextAmount === shipment.amount) return;

    setIsSavingAmount(true);
    setError("");
    try {
      await shipmentsApi.updateAmount(shipment.id, { amount: nextAmount });
      setSuccess("✓ Amount updated successfully");
      setTimeout(() => setSuccess(""), 2000);
      onUpdate?.();
      await loadShipment();
    } catch (err) {
      setError(getApiErrorMessage(err));
      setTimeout(() => setError(""), 3000);
    } finally {
      setIsSavingAmount(false);
    }
  };

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 200);
  };

  const handleBackdropClick = () => {
    if (!isBackdropEnabled) return;
    if (isLoading) return;
    // Avoid the navigation click (from a previous screen) immediately closing the modal
    // when we auto-open via URL params.
    if (Date.now() - openedAtRef.current < 500) return;
    handleClose();
  };

  const handleStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!shipment || !selectedStatus || selectedStatus === shipment.status) {
      setError("Please select a different status");
      setTimeout(() => setError(""), 3000);
      return;
    }

    const validTransitions = VALID_STATUS_TRANSITIONS[shipment.status] || [];
    if (!validTransitions.includes(selectedStatus)) {
      setError("Invalid status transition");
      setTimeout(() => setError(""), 3000);
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      await shipmentsApi.updateStatus(shipment.id, {
        status: selectedStatus,
      });
      setSuccess("✓ Status updated successfully");
      setTimeout(() => {
        setIsEditMode(false);
        setSuccess("");
        onUpdate?.();
        loadShipment();
      }, 2000);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setTimeout(() => setError(""), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCheckpoint = async (location: string, description: string) => {
    try {
      if (!shipment) return;
      await shipmentsApi.addCheckpoint(shipment.id, { location, description });
      await loadShipment();

      setSuccess("✓ Checkpoint added");
      setTimeout(() => setSuccess(""), 2000);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleAddNote = async (text: string) => {
    try {
      if (!shipment) return;
      await shipmentsApi.addNote(shipment.id, { text });
      await loadShipment();

      setSuccess("✓ Note added");
      setTimeout(() => setSuccess(""), 2000);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setTimeout(() => setError(""), 3000);
    }
  };

  if (!isOpen) return null;

  const statusColors = shipment
    ? SHIPMENT_STATUS_COLORS[shipment.status]
    : null;
  const validNextStatuses = shipment
    ? VALID_STATUS_TRANSITIONS[shipment.status] || []
    : [];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 transition-all duration-300"
        style={{
          backgroundColor: isAnimating
            ? "rgba(0, 0, 0, 0.75)"
            : "rgba(0, 0, 0, 0)",
          backdropFilter: isAnimating ? "blur(8px)" : "blur(0px)",
          opacity: isAnimating ? 1 : 0,
          pointerEvents: isBackdropEnabled ? "auto" : "none",
        }}
        onClick={handleBackdropClick}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="w-full max-w-6xl max-h-[92vh] rounded-2xl overflow-hidden pointer-events-auto transition-all duration-400"
          style={{
            backgroundColor: "var(--bg-primary)",
            border: "1px solid var(--border-medium)",
            boxShadow: isAnimating
              ? "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
              : "0 0 0 rgba(0, 0, 0, 0)",
            transform: isAnimating
              ? "scale(1) translateY(0)"
              : "scale(0.96) translateY(20px)",
            opacity: isAnimating ? 1 : 0,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="sticky top-0 z-20 p-6 lg:p-8 border-b"
            style={{
              borderColor: "var(--border-medium)",
              backgroundColor: "var(--bg-primary)",
              backdropFilter: "blur(12px)",
            }}
          >
            {isLoading && !shipment ? (
              <div className="animate-pulse space-y-3">
                <div
                  className="h-8 w-48 rounded"
                  style={{ backgroundColor: "var(--bg-overlay)" }}
                />
                <div
                  className="h-6 w-32 rounded"
                  style={{ backgroundColor: "var(--bg-overlay)" }}
                />
              </div>
            ) : (
              shipment && (
                <div className="flex items-start justify-between gap-6">
                  <div className="flex-1 min-w-0">
                    <h2
                      className="text-3xl lg:text-4xl font-bold tracking-tight mb-2"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {shipment.trackingId}
                    </h2>
                    <p
                      className="text-base lg:text-lg font-medium"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {shipment.customer.name}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className="px-4 py-2 rounded-full text-sm font-bold border-2 transition-all duration-200 hover:scale-105"
                      style={{
                        backgroundColor: statusColors?.bg,
                        color: statusColors?.text,
                        borderColor: statusColors?.border,
                      }}
                    >
                      {SHIPMENT_STATUS_LABELS[shipment.status]}
                    </span>

                    <button
                      onClick={handleClose}
                      disabled={isLoading}
                      className="p-2.5 rounded-xl transition-all duration-200 hover:rotate-90"
                      style={{
                        color: "var(--text-secondary)",
                        backgroundColor: "var(--bg-overlay)",
                        border: "1px solid var(--border-medium)",
                        cursor: isLoading ? "not-allowed" : "pointer",
                        opacity: isLoading ? 0.5 : 1,
                      }}
                      title="Close (Esc)"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              )
            )}
          </div>

          {/* Content */}
          <div
            className="overflow-y-auto"
            style={{ maxHeight: "calc(92vh - 120px)" }}
          >
            {/* Loading Skeleton */}
            {isLoading && !shipment && (
              <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                {[1, 2].map((col) => (
                  <div key={col} className="space-y-8 animate-pulse">
                    {[1, 2, 3].map((section) => (
                      <div key={section}>
                        <div
                          className="h-4 w-32 rounded mb-4"
                          style={{ backgroundColor: "var(--bg-overlay)" }}
                        />
                        <div className="space-y-3">
                          <div
                            className="h-6 w-full rounded"
                            style={{ backgroundColor: "var(--bg-overlay)" }}
                          />
                          <div
                            className="h-6 w-4/5 rounded"
                            style={{ backgroundColor: "var(--bg-overlay)" }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* Actual Content */}
            {shipment && (
              <div className="p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                {/* Left Column - Information */}
                <div className="space-y-8">
                  {/* Customer Information */}
                  <InfoSection
                    title="Customer Information"
                    items={[
                      {
                        icon: Mail,
                        label: "Email",
                        value: shipment.customer.email,
                        color: "var(--text-primary)",
                      },
                      {
                        icon: Phone,
                        label: "Sender Phone",
                        value: shipment.phone || "—",
                        color: "var(--text-primary)",
                      },
                      {
                        icon: Phone,
                        label: "Receiver Phone",
                        value: shipment.receiverPhone || "—",
                        color: "var(--text-primary)",
                      },
                    ]}
                  />

                  {/* Route Details */}
                  <InfoSection
                    title="Route Details"
                    items={[
                      {
                        icon: MapPin,
                        label: "Pickup",
                        value: shipment.pickupLocation,
                        color: "#22c55e",
                      },
                      {
                        icon: MapPin,
                        label: "Destination",
                        value: shipment.destinationLocation,
                        color: "#3b82f6",
                      },
                    ]}
                  />

                  {/* Package Details */}
                  <InfoSection
                    title="Package Details"
                    items={[
                      {
                        icon: Box,
                        label: "Type",
                        value: shipment.packageType,
                        color: "var(--text-primary)",
                      },
                      {
                        icon: Weight,
                        label: "Weight",
                        value: shipment.weight,
                        color: "var(--text-primary)",
                      },
                      {
                        icon: Ruler,
                        label: "Dimensions",
                        value: shipment.dimensions,
                        color: "var(--text-primary)",
                      },
                      {
                        icon: Calendar,
                        label: "Created",
                        value: formatTimestamp(shipment.createdAt),
                        color: "var(--text-primary)",
                      },
                    ]}
                  />

                  <div
                    className="p-6 rounded-xl border"
                    style={{
                      backgroundColor: "var(--bg-secondary)",
                      borderColor: "var(--border-medium)",
                    }}
                  >
                    <h3
                      className="text-xs font-bold uppercase tracking-wider mb-5 flex items-center gap-2"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      <div
                        className="h-1 w-8 rounded"
                        style={{ backgroundColor: "var(--border-strong)" }}
                      />
                      Pricing
                    </h3>

                    <div className="flex items-center justify-between gap-4 mb-4">
                      <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
                        Amount (₦)
                      </div>
                      <div className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                        ₦{(shipment.amount ?? 0).toLocaleString("en-NG")}
                      </div>
                    </div>

                    <form onSubmit={handleSaveAmount} className="flex gap-3">
                      <div className="flex-1">
                        <input
                          inputMode="numeric"
                          value={amountInput}
                          onChange={(e) => {
                            // keep digits only
                            const next = e.target.value.replace(/[^0-9]/g, "");
                            setAmountInput(next);
                          }}
                          placeholder="0"
                          disabled={isLoading || isSavingAmount}
                          className="w-full px-4 py-3 rounded-lg font-medium outline-none"
                          style={{
                            backgroundColor: "var(--bg-primary)",
                            border: "2px solid var(--border-medium)",
                            color: "var(--text-primary)",
                          }}
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={
                          isLoading ||
                          isSavingAmount ||
                          Number(amountInput || "0") === shipment.amount
                        }
                        className="px-5 py-3 rounded-lg font-bold transition-all"
                        style={{
                          backgroundColor:
                            isLoading ||
                            isSavingAmount ||
                            Number(amountInput || "0") === shipment.amount
                              ? "var(--bg-tertiary)"
                              : "var(--text-primary)",
                          color:
                            isLoading ||
                            isSavingAmount ||
                            Number(amountInput || "0") === shipment.amount
                              ? "var(--text-secondary)"
                              : "var(--text-inverse)",
                          border: "2px solid var(--border-strong)",
                          cursor:
                            isLoading ||
                            isSavingAmount ||
                            Number(amountInput || "0") === shipment.amount
                              ? "not-allowed"
                              : "pointer",
                          opacity:
                            isLoading ||
                            isSavingAmount ||
                            Number(amountInput || "0") === shipment.amount
                              ? 0.6
                              : 1,
                        }}
                      >
                        {isSavingAmount ? "Saving..." : "Save"}
                      </button>
                    </form>
                  </div>
                </div>

                {/* Right Column - Status & Management */}
                <div className="space-y-6">
                  {/* Delivered Status - Special UI */}
                  {shipment.status === "DELIVERED" && !isEditMode ? (
                    <div
                      className="relative overflow-hidden rounded-2xl p-8 text-center"
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(46, 196, 182, 0.15) 100%)",
                        border: "2px solid rgba(34, 197, 94, 0.3)",
                      }}
                    >
                      {/* Decorative circles */}
                      <div
                        className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-20"
                        style={{
                          background:
                            "radial-gradient(circle, rgba(34, 197, 94, 0.4) 0%, transparent 70%)",
                          transform: "translate(30%, -30%)",
                        }}
                      />
                      <div
                        className="absolute bottom-0 left-0 w-40 h-40 rounded-full opacity-20"
                        style={{
                          background:
                            "radial-gradient(circle, rgba(46, 196, 182, 0.4) 0%, transparent 70%)",
                          transform: "translate(-30%, 30%)",
                        }}
                      />

                      <div className="relative z-10">
                        {/* Success icon */}
                        <div
                          className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4"
                          style={{
                            backgroundColor: "rgba(34, 197, 94, 0.2)",
                            border: "3px solid var(--status-success)",
                          }}
                        >
                          <svg
                            className="w-10 h-10"
                            style={{ color: "var(--status-success)" }}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>

                        {/* Main message */}
                        <h3
                          className="text-3xl font-bold mb-2"
                          style={{ color: "var(--status-success)" }}
                        >
                          Delivery Completed!
                        </h3>
                        <p
                          className="text-base mb-6"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          This shipment has been successfully delivered to the
                          destination
                        </p>

                        {/* Delivery date */}
                        {shipment.statusHistory.find(
                          (h) => h.status === "DELIVERED"
                        ) && (
                          <div
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
                            style={{
                              backgroundColor: "rgba(34, 197, 94, 0.1)",
                              border: "1px solid rgba(34, 197, 94, 0.3)",
                            }}
                          >
                            <Calendar
                              className="w-4 h-4"
                              style={{ color: "var(--status-success)" }}
                            />
                            <span
                              className="text-sm font-medium"
                              style={{ color: "var(--status-success)" }}
                            >
                              {shipment.statusHistory.find(
                                (h) => h.status === "DELIVERED"
                              )?.timestamp
                                ? formatTimestamp(
                                    shipment.statusHistory.find(
                                      (h) => h.status === "DELIVERED"
                                    )!.timestamp
                                  )
                                : ""}
                            </span>
                          </div>
                        )}

                        {/* Status timeline - collapsed view */}
                        <details className="mt-6 text-left">
                          <summary
                            className="cursor-pointer text-sm font-semibold px-4 py-2 rounded-lg inline-block transition-all hover:scale-105"
                            style={{
                              color: "var(--text-secondary)",
                              backgroundColor: "rgba(100, 116, 139, 0.1)",
                            }}
                          >
                            View Delivery History
                          </summary>
                          <div className="mt-4">
                            <StatusTimeline
                              statusHistory={shipment.statusHistory}
                              currentStatus={shipment.status}
                            />
                          </div>
                        </details>
                      </div>
                    </div>
                  ) : !isEditMode ? (
                    <>
                      <StatusTimeline
                        statusHistory={shipment.statusHistory}
                        currentStatus={shipment.status}
                      />

                      <button
                        onClick={() => {
                          setIsEditMode(true);
                          setSelectedStatus(shipment.status);
                          setError("");
                        }}
                        className="w-full px-6 py-3.5 rounded-xl font-bold flex items-center justify-center gap-3 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg group"
                        style={{
                          backgroundColor: "var(--bg-secondary)",
                          color: "var(--text-primary)",
                          border: "2px solid var(--border-strong)",
                        }}
                      >
                        <Edit2 className="w-5 h-5 transition-transform group-hover:rotate-12" />
                        Update Status
                      </button>
                    </>
                  ) : (
                    <div className="space-y-6">
                      {/* Status Selector Form */}
                      <form onSubmit={handleStatusChange} className="space-y-6">
                        <div>
                          <label
                            className="block text-xs font-bold uppercase tracking-wider mb-3"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            Select New Status
                          </label>
                          <select
                            value={selectedStatus}
                            onChange={(e) => {
                              setSelectedStatus(
                                e.target.value as ShipmentStatus
                              );
                              setError("");
                            }}
                            disabled={isLoading}
                            className="w-full px-4 py-3 rounded-lg font-medium outline-none transition-all duration-200"
                            style={{
                              backgroundColor: "var(--bg-secondary)",
                              borderColor: "var(--border-medium)",
                              color: "var(--text-primary)",
                              border: "2px solid var(--border-medium)",
                            }}
                          >
                            <option value={shipment.status}>
                              {SHIPMENT_STATUS_LABELS[shipment.status]}{" "}
                              (Current)
                            </option>
                            {validNextStatuses.map((status: ShipmentStatus) => (
                              <option key={status} value={status}>
                                {SHIPMENT_STATUS_LABELS[status]}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Messages */}
                        {error && (
                          <div
                            className="p-4 rounded-xl flex items-center gap-3 animate-shake"
                            style={{
                              backgroundColor: "rgba(239, 68, 68, 0.1)",
                              border: "2px solid rgba(239, 68, 68, 0.3)",
                            }}
                          >
                            <span style={{ fontSize: "1.5rem" }}>⚠️</span>
                            <span
                              style={{
                                color: "#ef4444",
                                fontSize: "0.875rem",
                                fontWeight: "600",
                              }}
                            >
                              {error}
                            </span>
                          </div>
                        )}

                        {success && (
                          <div
                            className="p-4 rounded-xl flex items-center gap-3 animate-slideIn"
                            style={{
                              backgroundColor: "rgba(34, 197, 94, 0.1)",
                              border: "2px solid rgba(34, 197, 94, 0.3)",
                            }}
                          >
                            <span style={{ fontSize: "1.5rem" }}>✓</span>
                            <span
                              style={{
                                color: "#22c55e",
                                fontSize: "0.875rem",
                                fontWeight: "600",
                              }}
                            >
                              {success}
                            </span>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setIsEditMode(false);
                              setSelectedStatus(shipment.status);
                              setError("");
                            }}
                            disabled={isLoading}
                            className="flex-1 px-6 py-3 rounded-xl font-bold transition-all duration-200 hover:scale-[1.02]"
                            style={{
                              backgroundColor: "transparent",
                              color: "var(--text-secondary)",
                              border: "2px solid var(--border-medium)",
                              cursor: isLoading ? "not-allowed" : "pointer",
                              opacity: isLoading ? 0.5 : 1,
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={
                              isLoading || selectedStatus === shipment.status
                            }
                            className="flex-1 px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
                            style={{
                              backgroundColor:
                                isLoading || selectedStatus === shipment.status
                                  ? "var(--bg-tertiary)"
                                  : "var(--text-primary)",
                              color:
                                isLoading || selectedStatus === shipment.status
                                  ? "var(--text-secondary)"
                                  : "var(--text-inverse)",
                              border: "2px solid var(--border-strong)",
                              cursor:
                                isLoading || selectedStatus === shipment.status
                                  ? "not-allowed"
                                  : "pointer",
                              opacity:
                                isLoading || selectedStatus === shipment.status
                                  ? 0.5
                                  : 1,
                            }}
                          >
                            {isLoading ? (
                              <>
                                <span className="animate-spin">⏳</span>
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="w-5 h-5" />
                                Save Changes
                              </>
                            )}
                          </button>
                        </div>
                      </form>

                      {/* Checkpoints or Notes - OUTSIDE the status form */}
                      <div
                        className="pt-6 border-t"
                        style={{ borderColor: "var(--border-medium)" }}
                      >
                        {selectedStatus === "IN_TRANSIT" ||
                        shipment.status === "IN_TRANSIT" ? (
                          <CheckpointList
                            checkpoints={shipment.checkpoints}
                            onAddCheckpoint={handleAddCheckpoint}
                            isLoading={isLoading}
                          />
                        ) : (
                          <InternalNotes
                            notes={shipment.notes}
                            onAddNote={handleAddNote}
                            isLoading={isLoading}
                          />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-16px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }

        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>
    </>
  );
};

// Info Section Component
interface InfoItem {
  icon: React.ComponentType<{
    className?: string;
    style?: React.CSSProperties;
  }>;
  label: string;
  value: string;
  color: string;
}

interface InfoSectionProps {
  title: string;
  items: InfoItem[];
}

const InfoSection: React.FC<InfoSectionProps> = ({ title, items }) => (
  <div
    className="p-6 rounded-xl border transition-all duration-200 hover:border-opacity-100 hover:shadow-md"
    style={{
      backgroundColor: "var(--bg-secondary)",
      borderColor: "var(--border-medium)",
    }}
  >
    <h3
      className="text-xs font-bold uppercase tracking-wider mb-5 flex items-center gap-2"
      style={{ color: "var(--text-secondary)" }}
    >
      <div
        className="h-1 w-8 rounded"
        style={{ backgroundColor: "var(--border-strong)" }}
      />
      {title}
    </h3>
    <div className="space-y-4">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-start gap-4 group">
          <div
            className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110"
            style={{ backgroundColor: "var(--bg-overlay)" }}
          >
            <item.icon className="w-5 h-5" style={{ color: item.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div
              className="text-xs font-semibold uppercase tracking-wide mb-1"
              style={{ color: "var(--text-secondary)" }}
            >
              {item.label}
            </div>
            <div
              className="text-sm font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              {item.value}
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);
