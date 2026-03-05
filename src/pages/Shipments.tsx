import Sidebar from "../components/sidebar";
import { ShipmentDetailsModal } from "../components/shipment/ShipmentDetailsModal";
import {
  Search,
  Truck,
  Clock,
  CheckCircle,
  Package,
  ChevronRight,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { shipmentsApi } from "../services/shipmentsApi";
import { getApiErrorMessage } from "../services/apiClient";
import type { Shipment, ShipmentTableRow } from "../types/shipment";
import {
  formatTimestamp,
  SERVICE_TYPE_LABELS,
  SHIPMENT_STATUS_LABELS,
} from "../types/shipment";

const statusOrder = [
  "All",
  "Pending",
  "Quoted",
  "Accepted",
  "Picked Up",
  "In Transit",
  "Delivered",
  "Cancelled",
] as const;

type StatusFilter = (typeof statusOrder)[number];

const serviceOrder = [
  "All",
  "Air Freight",
  "Road Freight",
  "Sea Freight",
  "Door-to-Door",
] as const;

type ServiceFilter = (typeof serviceOrder)[number];

function getStatusPillColors(status: string) {
  switch (status.toLowerCase()) {
    case "pending":    return { bg: "rgba(255,193,7,0.12)",   text: "#ffc107",              border: "rgba(255,193,7,0.3)" };
    case "quoted":     return { bg: "rgba(59,130,246,0.12)",  text: "#3b82f6",              border: "rgba(59,130,246,0.3)" };
    case "accepted":   return { bg: "rgba(139,92,246,0.12)",  text: "#8b5cf6",              border: "rgba(139,92,246,0.3)" };
    case "picked up":  return { bg: "rgba(236,72,153,0.12)",  text: "#ec4899",              border: "rgba(236,72,153,0.3)" };
    case "in transit": return { bg: "rgba(46,196,182,0.12)",  text: "var(--accent-teal)",   border: "rgba(46,196,182,0.3)" };
    case "delivered":  return { bg: "rgba(34,197,94,0.12)",   text: "var(--status-success)",border: "rgba(34,197,94,0.3)" };
    case "cancelled":  return { bg: "rgba(239,68,68,0.12)",   text: "#ef4444",              border: "rgba(239,68,68,0.3)" };
    default:           return { bg: "rgba(100,116,139,0.12)", text: "var(--text-secondary)", border: "rgba(100,116,139,0.3)" };
  }
}

function toShipmentRow(shipment: Shipment): ShipmentTableRow {
  return {
    id: shipment.id,
    trackingId: shipment.trackingId,
    customer: shipment.customer.name || shipment.customer.email,
    email: shipment.customer.email,
    phone: shipment.phone,
    route: `${shipment.pickupLocation} → ${shipment.destinationLocation}`,
    service: SERVICE_TYPE_LABELS[shipment.serviceType],
    status: SHIPMENT_STATUS_LABELS[shipment.status],
    statusRaw: shipment.status,
    created: formatTimestamp(shipment.createdAt),
  };
}

const Shipments = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [serviceFilter, setServiceFilter] = useState<ServiceFilter>("All");
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);
  const [shipments, setShipments] = useState<ShipmentTableRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const customerParam = searchParams.get("customer");
  const openParam = searchParams.get("open");

  useEffect(() => {
    if (!customerParam) return;
    setSearchQuery(customerParam);
  }, [customerParam]);

  useEffect(() => {
    if (!openParam) return;
    setSelectedShipmentId(openParam);
  }, [openParam]);

  const loadShipments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await shipmentsApi.list();
      setShipments(data.map(toShipmentRow));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadShipments(); }, []);

  const clearUrlFilters = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("customer");
    next.delete("open");
    setSearchParams(next);
    setSearchQuery("");
    navigate({ pathname: "/shipments", search: next.toString() });
  };

  const stats = useMemo(() => {
    const total = shipments.length;
    const pending = shipments.filter((s) => s.status === "Pending").length;
    const inTransit = shipments.filter((s) => s.status === "In Transit").length;
    const delivered = shipments.filter((s) => s.status === "Delivered").length;
    return { total, pending, inTransit, delivered };
  }, [shipments]);

  const filteredShipments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return shipments.filter((s) => {
      const matchesQuery =
        !q ||
        s.trackingId.toLowerCase().includes(q) ||
        s.customer.toLowerCase().includes(q) ||
        s.phone.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "All" || s.status === statusFilter;
      const matchesService = serviceFilter === "All" || s.service === serviceFilter;
      return matchesQuery && matchesStatus && matchesService;
    });
  }, [shipments, searchQuery, statusFilter, serviceFilter]);

  const allFilteredIds = useMemo(() => filteredShipments.map((s) => s.id), [filteredShipments]);
  const currentIndex = selectedShipmentId ? allFilteredIds.indexOf(selectedShipmentId) : -1;

  return (
    <Sidebar>
      <style>{`
        input::placeholder { color: var(--text-secondary) !important; }
        .ship-row { cursor: pointer; transition: background 0.12s; }
        .ship-row:hover { background: rgba(46,196,182,0.06) !important; }
        .ship-row:hover .row-arrow { opacity: 1; transform: translateX(3px); }
        .row-arrow { opacity: 0; transition: opacity 0.15s, transform 0.15s; }
      `}</style>

      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold header" style={{ color: "var(--text-primary)" }}>
            Shipments
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Search, filter, and manage all shipments. Click any row to open full details.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { title: "Total Shipments", value: stats.total, icon: Package },
            { title: "Pending", value: stats.pending, icon: Clock },
            { title: "In Transit", value: stats.inTransit, icon: Truck },
            { title: "Delivered", value: stats.delivered, icon: CheckCircle },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="p-5 rounded-2xl border"
                style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-medium)" }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium header" style={{ color: "var(--text-secondary)" }}>
                      {card.title}
                    </p>
                    <p className="text-2xl font-bold mt-1 tabular-nums" style={{ color: "var(--text-primary)" }}>
                      {card.value}
                    </p>
                  </div>
                  <div
                    className="h-11 w-11 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: "rgba(46,196,182,0.12)" }}
                  >
                    <Icon className="h-5 w-5" style={{ color: "var(--accent-teal)" }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Controls */}
        <div className="flex flex-col lg:flex-row gap-3">
          <div
            className="flex-1 relative rounded-xl border overflow-hidden"
            style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-medium)" }}
          >
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--text-secondary)" }} />
            <input
              type="text"
              placeholder="Search by tracking ID, customer, or phone…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-3 bg-transparent outline-none text-sm"
              style={{ color: "var(--text-primary)" }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded transition hover:opacity-70"
                style={{ color: "var(--text-secondary)" }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="px-3 py-2.5 rounded-xl border outline-none text-sm font-medium cursor-pointer"
              style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-medium)", color: "var(--text-primary)" }}
            >
              {statusOrder.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>

            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value as ServiceFilter)}
              className="px-3 py-2.5 rounded-xl border outline-none text-sm font-medium cursor-pointer"
              style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-medium)", color: "var(--text-primary)" }}
            >
              {serviceOrder.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Deep-link context banner */}
        {(customerParam || openParam) && (
          <div
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl border"
            style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-medium)" }}
          >
            <div className="text-sm">
              <span style={{ color: "var(--text-secondary)" }}>Filtered view</span>
              {customerParam && (
                <> <span style={{ color: "var(--text-secondary)" }}>·</span> <span className="font-semibold">Customer:</span> {customerParam}</>
              )}
              {openParam && (
                <> <span style={{ color: "var(--text-secondary)" }}>·</span> <span className="font-semibold">Auto-open:</span> {openParam}</>
              )}
            </div>
            <button
              onClick={clearUrlFilters}
              className="px-4 py-2 rounded-lg text-sm font-semibold border transition hover:opacity-80"
              style={{ backgroundColor: "transparent", color: "var(--text-secondary)", borderColor: "var(--border-medium)" }}
            >
              Clear
            </button>
          </div>
        )}

        {/* Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold header" style={{ color: "var(--text-primary)" }}>All Shipments</h2>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{filteredShipments.length} result(s)</p>
          </div>

          <div
            className="relative overflow-x-auto rounded-2xl border"
            style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-medium)" }}
          >
            <table className="w-full text-sm text-left">
              <thead style={{ backgroundColor: "var(--bg-tertiary)", borderBottom: "1px solid var(--border-medium)" }}>
                <tr>
                  {["Tracking ID", "Customer", "Phone", "Service", "Status", "Created", ""].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-4 text-xs font-bold uppercase tracking-wider"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filteredShipments.map((shipment, idx) => {
                  const statusColor = getStatusPillColors(shipment.status);
                  return (
                    <tr
                      key={shipment.id}
                      className="ship-row border-b"
                      style={{
                        borderColor: "var(--border-medium)",
                        backgroundColor: idx % 2 === 0 ? "rgba(46,196,182,0.03)" : "transparent",
                      }}
                      onClick={() => setSelectedShipmentId(shipment.id)}
                    >
                      <td className="px-5 py-4 font-bold" style={{ color: "var(--accent-teal)" }}>
                        {shipment.trackingId}
                      </td>
                      <td className="px-5 py-4 header" style={{ color: "var(--text-primary)" }}>
                        {shipment.customer}
                        <div className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                          {shipment.email}
                        </div>
                      </td>
                      <td className="px-5 py-4" style={{ color: "var(--text-secondary)" }}>{shipment.phone}</td>
                      <td className="px-5 py-4" style={{ color: "var(--text-secondary)" }}>{shipment.service}</td>
                      <td className="px-5 py-4">
                        <span
                          className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold border"
                          style={{
                            backgroundColor: statusColor.bg,
                            color: statusColor.text,
                            borderColor: statusColor.border,
                          }}
                        >
                          {shipment.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs" style={{ color: "var(--text-secondary)" }}>
                        {shipment.created}
                      </td>
                      <td className="px-4 py-4 w-8">
                        <ChevronRight className="row-arrow h-4 w-4" style={{ color: "var(--accent-teal)" }} />
                      </td>
                    </tr>
                  );
                })}

                {!isLoading && !error && filteredShipments.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
                      No shipments match your search/filters.
                    </td>
                  </tr>
                )}

                {isLoading && (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
                      Loading shipments…
                    </td>
                  </tr>
                )}

                {!isLoading && error && (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-sm" style={{ color: "#ef4444" }}>
                      {error}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <ShipmentDetailsModal
          isOpen={!!selectedShipmentId}
          onClose={() => {
            setSelectedShipmentId(null);
            if (openParam) {
              const next = new URLSearchParams(searchParams);
              next.delete("open");
              setSearchParams(next);
              navigate({ pathname: "/shipments", search: next.toString() });
            }
          }}
          shipmentId={selectedShipmentId || ""}
          onUpdate={loadShipments}
          allShipmentIds={allFilteredIds}
          currentIndex={currentIndex}
          onNavigate={(id) => setSelectedShipmentId(id)}
        />
      </div>
    </Sidebar>
  );
};

export default Shipments;
