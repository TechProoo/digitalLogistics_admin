import React from "react";
import {
  Clock,
  FileText,
  CheckCircle,
  Truck,
  Plane,
  PackageCheck,
  XCircle,
} from "lucide-react";
import type {
  ShipmentStatusHistoryItem,
  ShipmentStatus,
} from "../../types/shipment";
import {
  formatTimestamp,
  SHIPMENT_STATUS_LABELS,
  SHIPMENT_STATUS_COLORS,
} from "../../types/shipment";

interface StatusTimelineProps {
  statusHistory: ShipmentStatusHistoryItem[];
  currentStatus: ShipmentStatus;
}

const getStatusIcon = (status: ShipmentStatus, isActive: boolean) => {
  const iconProps = {
    className: `w-5 h-5 transition-transform duration-300 ${
      isActive ? "scale-110" : ""
    }`,
  };

  switch (status) {
    case "PENDING":
      return <Clock {...iconProps} />;
    case "QUOTED":
      return <FileText {...iconProps} />;
    case "ACCEPTED":
      return <CheckCircle {...iconProps} />;
    case "PICKED_UP":
      return <Truck {...iconProps} />;
    case "IN_TRANSIT":
      return <Plane {...iconProps} />;
    case "DELIVERED":
      return <PackageCheck {...iconProps} />;
    case "CANCELLED":
      return <XCircle {...iconProps} />;
    default:
      return <Clock {...iconProps} />;
  }
};

export const StatusTimeline: React.FC<StatusTimelineProps> = ({
  statusHistory,
  currentStatus,
}) => {
  return (
    <div className="space-y-6">
      <h3
        className="text-xs font-bold uppercase tracking-wider flex items-center gap-2"
        style={{ color: "var(--text-secondary)" }}
      >
        <div
          className="h-1 w-8 rounded"
          style={{ backgroundColor: "var(--border-strong)" }}
        />
        Status History
      </h3>

      <div className="space-y-1">
        {statusHistory.map((item, idx) => {
          const isCurrent = item.status === currentStatus;
          const isCompleted =
            idx < statusHistory.findIndex((h) => h.status === currentStatus);
          const colors = SHIPMENT_STATUS_COLORS[item.status];

          return (
            <div
              key={`${item.status}-${idx}`}
              className="relative"
              style={{
                animationDelay: `${idx * 100}ms`,
              }}
            >
              <div className="flex gap-4 group">
                {/* Timeline Connector */}
                {idx < statusHistory.length - 1 && (
                  <div
                    className="absolute left-5 top-12 w-0.5 h-full transition-all duration-300"
                    style={{
                      backgroundColor: isCompleted
                        ? "var(--border-strong)"
                        : "var(--border-soft)",
                      transform: isCompleted ? "scaleY(1)" : "scaleY(0.8)",
                    }}
                  />
                )}

                {/* Status Icon */}
                <div
                  className={`relative z-10 shrink-0 flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 ${
                    isCurrent ? "animate-pulse shadow-lg" : ""
                  }`}
                  style={{
                    backgroundColor: colors.bg,
                    borderColor: colors.text,
                    color: colors.text,
                    boxShadow: isCurrent ? `0 0 20px ${colors.text}40` : "none",
                  }}
                >
                  {getStatusIcon(item.status, isCurrent)}
                </div>

                {/* Content */}
                <div className="flex-1 pb-8">
                  <div
                    className="flex items-center gap-3 mb-1"
                    style={{
                      transform: isCurrent
                        ? "translateX(4px)"
                        : "translateX(0)",
                      transition: "transform 0.3s ease",
                    }}
                  >
                    <div
                      className={`font-bold text-base ${
                        isCurrent ? "text-lg" : ""
                      }`}
                      style={{
                        color: isCurrent ? colors.text : "var(--text-primary)",
                      }}
                    >
                      {SHIPMENT_STATUS_LABELS[item.status]}
                    </div>
                    {isCurrent && (
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-bold"
                        style={{
                          backgroundColor: colors.bg,
                          color: colors.text,
                          border: `1px solid ${colors.border}`,
                        }}
                      >
                        CURRENT
                      </span>
                    )}
                  </div>

                  <div
                    className="text-xs font-medium mb-2"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {formatTimestamp(item.timestamp)}
                    {item.adminName && (
                      <>
                        <span className="mx-1.5">•</span>
                        <span className="font-semibold">{item.adminName}</span>
                      </>
                    )}
                  </div>

                  {item.note && (
                    <div
                      className="mt-3 p-3 rounded-lg text-sm font-medium transition-all duration-200 hover:translate-x-1"
                      style={{
                        backgroundColor: `${colors.bg}80`,
                        borderLeft: `3px solid ${colors.text}`,
                        color: "var(--text-primary)",
                      }}
                    >
                      {item.note}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .space-y-1 > div {
          animation: fadeSlideIn 0.4s ease-out backwards;
        }
      `}</style>
    </div>
  );
};
