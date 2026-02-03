import Sidebar from "../components/sidebar";
import { ShipmentDetailsModal } from "../components/shipment/ShipmentDetailsModal";
import {
  AlertCircle,
  Package,
  Clock,
  Truck,
  CheckCircle,
  Search,
  MoreVertical,
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

const Dashboard = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(
    null,
  );
  const [shipments, setShipments] = useState<ShipmentTableRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    loadShipments();
  }, []);

  const stats = useMemo(() => {
    const total = shipments.length;
    const inTransit = shipments.filter(
      (s) => s.statusRaw === "IN_TRANSIT",
    ).length;
    const delivered = shipments.filter(
      (s) => s.statusRaw === "DELIVERED",
    ).length;
    const pendingRequests = shipments.filter(
      (s) => s.statusRaw === "PENDING",
    ).length;

    return [
      {
        title: "Total Shipments",
        value: String(total),
        change: null,
        icon: Package,
      },
      {
        title: "Pending Requests",
        value: String(pendingRequests),
        change: null,
        icon: Clock,
      },
      {
        title: "In Transit",
        value: String(inTransit),
        change: null,
        icon: Truck,
      },
      {
        title: "Delivered",
        value: String(delivered),
        change: null,
        icon: CheckCircle,
      },
    ];
  }, [shipments]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return {
          bg: "rgba(255, 193, 7, 0.12)",
          text: "#ffc107",
          label: "Pending",
        };
      case "quoted":
        return {
          bg: "rgba(59, 130, 246, 0.12)",
          text: "#3b82f6",
          label: "Quoted",
        };
      case "accepted":
        return {
          bg: "rgba(139, 92, 246, 0.12)",
          text: "#8b5cf6",
          label: "Accepted",
        };
      case "picked up":
      case "picked_up":
        return {
          bg: "rgba(236, 72, 153, 0.12)",
          text: "#ec4899",
          label: "Picked Up",
        };
      case "in transit":
      case "in_transit":
        return {
          bg: "rgba(46, 196, 182, 0.12)",
          text: "var(--accent-teal)",
          label: "In Transit",
        };
      case "delivered":
        return {
          bg: "rgba(34, 197, 94, 0.12)",
          text: "var(--status-success)",
          label: "Delivered",
        };
      case "cancelled":
        return {
          bg: "rgba(239, 68, 68, 0.12)",
          text: "#ef4444",
          label: "Cancelled",
        };
      default:
        return {
          bg: "rgba(100, 116, 139, 0.12)",
          text: "#64748b",
          label: status,
        };
    }
  };

  const filteredShipments = shipments.filter((shipment) => {
    const q = searchQuery.trim().toLowerCase();

    const matchesSearch =
      !q ||
      shipment.trackingId.toLowerCase().includes(q) ||
      shipment.customer.toLowerCase().includes(q) ||
      shipment.phone.toLowerCase().includes(q) ||
      shipment.email.toLowerCase().includes(q);

    const matchesStatus =
      statusFilter === "all" || shipment.status === statusFilter;
    const matchesService =
      serviceFilter === "all" || shipment.service === serviceFilter;

    return matchesSearch && matchesStatus && matchesService;
  });

  return (
    <Sidebar>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1
              className="text-4xl font-bold mb-2 header"
              style={{ color: "var(--text-primary)" }}
            >
              Dashboard Overview
            </h1>
            <p style={{ color: "var(--text-secondary)" }}>
              Manage shipments and track deliveries
            </p>
          </div>

          {/* Alert Badge */}
          <div
            className="flex items-center gap-2 px-4 py-3 rounded-lg"
            style={{
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
            }}
          >
            <AlertCircle className="h-5 w-5" style={{ color: "#ef4444" }} />
            <span style={{ color: "#ef4444" }} className="font-medium">
              1 pending quote needs attention
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div
                key={idx}
                className="rounded-xl border p-6 transition-all hover:shadow-lg hover:border-opacity-100"
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  borderColor: "var(--border-medium)",
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p
                      className="text-sm font-medium mb-2 header"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {stat.title}
                    </p>
                    <h3
                      className="text-3xl font-bold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {stat.value}
                    </h3>
                    {stat.change && (
                      <p
                        className="text-xs font-medium mt-2"
                        style={{ color: "var(--status-success)" }}
                      >
                        {stat.change}
                      </p>
                    )}
                  </div>
                  <div
                    className="h-12 w-12 rounded-lg flex items-center justify-center"
                    style={{
                      backgroundColor: "rgba(46, 196, 182, 0.12)",
                    }}
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

        {/* Recent Shipments */}
        <div className="space-y-6">
          <h2
            className="text-2xl font-bold header"
            style={{ color: "var(--text-primary)" }}
          >
            Recent Shipments
          </h2>
          <a href=""></a>

          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div
              className="flex-1 relative rounded-lg border overflow-hidden transition-all focus-within:border-opacity-100"
              style={{
                backgroundColor: "var(--bg-secondary)",
                borderColor: "var(--border-medium)",
              }}
            >
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5"
                style={{ color: "var(--text-secondary)" }}
              />
              <input
                type="text"
                placeholder="Search by tracking ID, customer name, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-transparent outline-none"
                style={{
                  color: "var(--text-primary)",
                }}
              />
              <style>{`
                input::placeholder {
                  color: var(--text-secondary);
                }
              `}</style>
            </div>

            {/* Filters */}
            <div className="flex gap-3">
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="flex items-center gap-2 px-4 py-3 rounded-lg border transition-all outline-none"
                  style={{
                    backgroundColor: "var(--bg-secondary)",
                    borderColor: "var(--border-medium)",
                    color: "var(--text-primary)",
                  }}
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
              </div>

              <div className="relative">
                <select
                  value={serviceFilter}
                  onChange={(e) => setServiceFilter(e.target.value)}
                  className="flex items-center gap-2 px-4 py-3 rounded-lg border transition-all outline-none"
                  style={{
                    backgroundColor: "var(--bg-secondary)",
                    borderColor: "var(--border-medium)",
                    color: "var(--text-primary)",
                  }}
                >
                  <option value="all">All Services</option>
                  <option value="Air Freight">Air Freight</option>
                  <option value="Road Freight">Road Freight</option>
                  <option value="Sea Freight">Sea Freight</option>
                  <option value="Door-to-Door">Door-to-Door</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table */}
          <div
            className="relative overflow-x-auto rounded-xl border"
            style={{
              backgroundColor: "var(--bg-secondary)",
              borderColor: "var(--border-medium)",
            }}
          >
            <table className="w-full text-sm text-left">
              <thead
                style={{
                  backgroundColor: "var(--bg-tertiary)",
                  borderBottom: "1px solid var(--border-medium)",
                }}
              >
                <tr>
                  <th
                    className="px-6 py-4 font-semibold header"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Tracking ID
                  </th>
                  <th
                    className="px-6 py-4 font-semibold header"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Customer
                  </th>
                  <th
                    className="px-6 py-4 font-semibold header"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Phone
                  </th>
                  <th
                    className="px-6 py-4 font-semibold header"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Service
                  </th>
                  <th
                    className="px-6 py-4 font-semibold header"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Status
                  </th>
                  <th
                    className="px-6 py-4 font-semibold header"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Created
                  </th>
                  <th
                    className="px-6 py-4 font-semibold text-center"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-10 text-center"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Loading shipments...
                    </td>
                  </tr>
                )}

                {!isLoading && error && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-10 text-center"
                      style={{ color: "#ef4444" }}
                    >
                      {error}
                    </td>
                  </tr>
                )}

                {!isLoading && !error && filteredShipments.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-10 text-center"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      No shipments match your search/filters.
                    </td>
                  </tr>
                )}

                {!isLoading &&
                  !error &&
                  filteredShipments.map((shipment, idx) => {
                    const statusColor = getStatusColor(shipment.status);
                    const isEven = idx % 2 === 0;
                    return (
                      <tr
                        key={shipment.id}
                        className="border-b transition-colors hover:opacity-80"
                        style={{
                          backgroundColor: isEven
                            ? "rgba(46, 196, 182, 0.02)"
                            : "transparent",
                          borderColor: "var(--border-medium)",
                        }}
                      >
                        <td
                          className="px-6 py-4 font-semibold whitespace-nowrap"
                          style={{ color: "var(--accent-teal)" }}
                        >
                          {shipment.trackingId}
                        </td>
                        <td className="px-6 py-4">
                          <div
                            className="font-semibold head"
                            style={{ color: "var(--text-primary)" }}
                          >
                            <p className="header">{shipment.customer}</p>
                          </div>
                          <div
                            className="text-xs"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            {shipment.email}
                          </div>
                        </td>
                        <td
                          className="px-6 py-4"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {shipment.phone}
                        </td>
                        <td
                          className="px-6 py-4"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {shipment.service}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className="inline-block px-3 py-1 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: statusColor.bg,
                              color: statusColor.text,
                            }}
                          >
                            {statusColor.label}
                          </span>
                        </td>
                        <td
                          className="px-6 py-4"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {shipment.created}
                        </td>
                        <td className="px-6 py-4 text-center relative">
                          <button
                            onClick={() =>
                              setOpenMenu(
                                openMenu === shipment.id ? null : shipment.id,
                              )
                            }
                            className="p-2 rounded-lg transition-all"
                            style={{
                              backgroundColor: "rgba(46, 196, 182, 0.08)",
                              color: "var(--text-secondary)",
                              border: "none",
                              cursor: "pointer",
                            }}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                          {openMenu === shipment.id && (
                            <div
                              className="absolute right-0 mt-2 w-44 rounded-lg border shadow-lg z-20 overflow-hidden"
                              style={{
                                backgroundColor: "var(--bg-secondary)",
                                borderColor: "var(--border-medium)",
                              }}
                            >
                              <button
                                onClick={() => {
                                  setSelectedShipmentId(shipment.id);
                                  setOpenMenu(null);
                                }}
                                className="w-full px-4 py-3 text-left text-sm font-medium transition-colors"
                                style={{
                                  color: "var(--text-primary)",
                                  backgroundColor: "transparent",
                                  border: "none",
                                  cursor: "pointer",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor =
                                    "rgba(46, 196, 182, 0.08)";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor =
                                    "transparent";
                                }}
                              >
                                View Details
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <ShipmentDetailsModal
        isOpen={!!selectedShipmentId}
        onClose={() => setSelectedShipmentId(null)}
        shipmentId={selectedShipmentId || ""}
        onUpdate={() => {
          loadShipments();
        }}
      />
    </Sidebar>
  );
};

export default Dashboard;
