import Sidebar from "../components/sidebar";
import { ShipmentDetailsModal } from "../components/shipment/ShipmentDetailsModal";
import {
  AlertCircle,
  Package,
  Clock,
  Truck,
  CheckCircle,
  Search,
  ChevronRight,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { shipmentsApi } from "../services/shipmentsApi";
import { getApiErrorMessage } from "../services/apiClient";
import type { Shipment, ShipmentTableRow } from "../types/shipment";
import {
  formatTimestamp,
  SERVICE_TYPE_LABELS,
  SHIPMENT_STATUS_LABELS,
} from "../types/shipment";

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

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "pending":    return { bg: "rgba(255,193,7,0.12)",   text: "#ffc107" };
    case "quoted":     return { bg: "rgba(59,130,246,0.12)",  text: "#3b82f6" };
    case "accepted":   return { bg: "rgba(139,92,246,0.12)",  text: "#8b5cf6" };
    case "picked up":  return { bg: "rgba(236,72,153,0.12)",  text: "#ec4899" };
    case "in transit": return { bg: "rgba(46,196,182,0.12)",  text: "var(--accent-teal)" };
    case "delivered":  return { bg: "rgba(34,197,94,0.12)",   text: "var(--status-success)" };
    case "cancelled":  return { bg: "rgba(239,68,68,0.12)",   text: "#ef4444" };
    default:           return { bg: "rgba(100,116,139,0.12)", text: "#64748b" };
  }
};

const Dashboard = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);
  const [shipments, setShipments] = useState<ShipmentTableRow[]>([]);
  const [rawShipments, setRawShipments] = useState<Shipment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadShipments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await shipmentsApi.list();
      setRawShipments(data);
      setShipments(data.map(toShipmentRow));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadShipments(); }, []);

  const stats = useMemo(() => {
    const now = Date.now();
    const pendingOver24h = rawShipments.filter(
      (s) => s.status === "PENDING" && now - new Date(s.createdAt).getTime() > 86_400_000,
    ).length;
    const unassignedInTransit = rawShipments.filter(
      (s) => s.status === "IN_TRANSIT" && !s.driverId,
    ).length;

    return [
      {
        title: "Total Shipments",
        value: shipments.length,
        icon: Package,
        sub: null as string | null,
        subColor: "var(--text-secondary)",
      },
      {
        title: "Pending",
        value: shipments.filter((s) => s.statusRaw === "PENDING").length,
        icon: Clock,
        sub: pendingOver24h > 0 ? `${pendingOver24h} waiting >24h` : null,
        subColor: "#f59e0b",
      },
      {
        title: "In Transit",
        value: shipments.filter((s) => s.statusRaw === "IN_TRANSIT").length,
        icon: Truck,
        sub: unassignedInTransit > 0 ? `${unassignedInTransit} unassigned` : null,
        subColor: "#ef4444",
      },
      {
        title: "Delivered",
        value: shipments.filter((s) => s.statusRaw === "DELIVERED").length,
        icon: CheckCircle,
        sub: null as string | null,
        subColor: "var(--text-secondary)",
      },
    ];
  }, [shipments, rawShipments]);

  const pendingCount = shipments.filter((s) => s.statusRaw === "PENDING").length;

  const filteredShipments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return shipments.filter((s) => {
      const matchesSearch =
        !q ||
        s.trackingId.toLowerCase().includes(q) ||
        s.customer.toLowerCase().includes(q) ||
        s.phone.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || s.status === statusFilter;
      const matchesService = serviceFilter === "all" || s.service === serviceFilter;
      return matchesSearch && matchesStatus && matchesService;
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
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold mb-1 header" style={{ color: "var(--text-primary)" }}>
              Dashboard
            </h1>
            <p style={{ color: "var(--text-secondary)" }}>Manage shipments and track deliveries</p>
          </div>

          {pendingCount > 0 && (
            <div
              className="flex items-center gap-2 px-4 py-3 rounded-xl"
              style={{
                backgroundColor: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.25)",
              }}
            >
              <AlertCircle className="h-4 w-4 shrink-0" style={{ color: "#ef4444" }} />
              <span className="text-sm font-semibold" style={{ color: "#ef4444" }}>
                {pendingCount} pending shipment{pendingCount !== 1 ? "s" : ""} need attention
              </span>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.title}
                className="rounded-2xl border p-5"
                style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-medium)" }}
              >
                <div className="flex items-start justify-between mb-3">
                  <p className="text-sm font-medium header" style={{ color: "var(--text-secondary)" }}>
                    {stat.title}
                  </p>
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: "rgba(46,196,182,0.12)" }}
                  >
                    <Icon className="h-5 w-5" style={{ color: "var(--accent-teal)" }} />
                  </div>
                </div>
                <h3 className="text-3xl font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>
                  {stat.value}
                </h3>
                {stat.sub && (
                  <p className="text-xs font-semibold mt-1.5" style={{ color: stat.subColor }}>
                    ↑ {stat.sub}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Shipments table */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold header" style={{ color: "var(--text-primary)" }}>
            Recent Shipments
          </h2>

          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-3">
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
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2.5 rounded-xl border outline-none text-sm font-medium cursor-pointer"
                style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-medium)", color: "var(--text-primary)" }}
              >
                <option value="all">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Quoted">Quoted</option>
                <option value="Accepted">Accepted</option>
                <option value="Picked Up">Picked Up</option>
                <option value="In Transit">In Transit</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
              </select>

              <select
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
                className="px-3 py-2.5 rounded-xl border outline-none text-sm font-medium cursor-pointer"
                style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-medium)", color: "var(--text-primary)" }}
              >
                <option value="all">All Services</option>
                <option value="Air Freight">Air Freight</option>
                <option value="Road Freight">Road Freight</option>
                <option value="Sea Freight">Sea Freight</option>
                <option value="Door-to-Door">Door-to-Door</option>
              </select>
            </div>
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
                {isLoading && (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
                      Loading shipments…
                    </td>
                  </tr>
                )}

                {!isLoading && error && (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-sm" style={{ color: "#ef4444" }}>{error}</td>
                  </tr>
                )}

                {!isLoading && !error && filteredShipments.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
                      No shipments match your search/filters.
                    </td>
                  </tr>
                )}

                {!isLoading && !error && filteredShipments.map((shipment, idx) => {
                  const statusColor = getStatusColor(shipment.status);
                  return (
                    <tr
                      key={shipment.id}
                      className="ship-row border-b"
                      style={{
                        borderColor: "var(--border-medium)",
                        backgroundColor: idx % 2 === 0 ? "rgba(46,196,182,0.02)" : "transparent",
                      }}
                      onClick={() => setSelectedShipmentId(shipment.id)}
                    >
                      <td className="px-5 py-4 font-bold whitespace-nowrap" style={{ color: "var(--accent-teal)" }}>
                        {shipment.trackingId}
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-sm header" style={{ color: "var(--text-primary)" }}>{shipment.customer}</div>
                        <div className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{shipment.email}</div>
                      </td>
                      <td className="px-5 py-4 text-sm" style={{ color: "var(--text-secondary)" }}>{shipment.phone}</td>
                      <td className="px-5 py-4 text-sm" style={{ color: "var(--text-secondary)" }}>{shipment.service}</td>
                      <td className="px-5 py-4">
                        <span
                          className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold"
                          style={{ backgroundColor: statusColor.bg, color: statusColor.text }}
                        >
                          {shipment.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs" style={{ color: "var(--text-secondary)" }}>{shipment.created}</td>
                      <td className="px-4 py-4 w-8">
                        <ChevronRight className="row-arrow h-4 w-4" style={{ color: "var(--accent-teal)" }} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {!isLoading && filteredShipments.length > 0 && (
              <div
                className="px-5 py-3 border-t flex items-center justify-between"
                style={{ borderColor: "var(--border-medium)" }}
              >
                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  {filteredShipments.length} of {shipments.length} shipments
                </span>
                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  Click any row to open details
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <ShipmentDetailsModal
        isOpen={!!selectedShipmentId}
        onClose={() => setSelectedShipmentId(null)}
        shipmentId={selectedShipmentId || ""}
        onUpdate={loadShipments}
        allShipmentIds={allFilteredIds}
        currentIndex={currentIndex}
        onNavigate={(id) => setSelectedShipmentId(id)}
      />
    </Sidebar>
  );
};

export default Dashboard;
