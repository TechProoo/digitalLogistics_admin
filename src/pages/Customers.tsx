import Sidebar from "../components/sidebar";
import { SHIPMENTS_TABLE_ROWS } from "../data/shipments";
import { CheckCircle, Package, Search, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

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

type CustomerRow = {
  key: string;
  name: string;
  email: string;
  phone: string;
  totalShipments: number;
  activeShipments: number;
  lastShipmentId: string;
  lastShipmentStatus: string;
  lastShipmentCreated: string;
};

function isActiveShipment(status: string) {
  const s = status.toLowerCase();
  return s !== "delivered" && s !== "cancelled";
}

function safeDateValue(dateStr: string) {
  const t = new Date(dateStr).getTime();
  return Number.isFinite(t) ? t : 0;
}

function getStatusPillColors(status: string) {
  switch (status.toLowerCase()) {
    case "pending":
      return {
        bg: "rgba(255, 193, 7, 0.12)",
        text: "#ffc107",
        border: "rgba(255, 193, 7, 0.3)",
      };
    case "quoted":
      return {
        bg: "rgba(59, 130, 246, 0.12)",
        text: "#3b82f6",
        border: "rgba(59, 130, 246, 0.3)",
      };
    case "accepted":
      return {
        bg: "rgba(139, 92, 246, 0.12)",
        text: "#8b5cf6",
        border: "rgba(139, 92, 246, 0.3)",
      };
    case "picked up":
    case "picked_up":
      return {
        bg: "rgba(236, 72, 153, 0.12)",
        text: "#ec4899",
        border: "rgba(236, 72, 153, 0.3)",
      };
    case "in transit":
    case "in_transit":
      return {
        bg: "rgba(46, 196, 182, 0.12)",
        text: "var(--accent-teal)",
        border: "rgba(46, 196, 182, 0.3)",
      };
    case "delivered":
      return {
        bg: "rgba(34, 197, 94, 0.12)",
        text: "var(--status-success)",
        border: "rgba(34, 197, 94, 0.3)",
      };
    case "cancelled":
      return {
        bg: "rgba(239, 68, 68, 0.12)",
        text: "#ef4444",
        border: "rgba(239, 68, 68, 0.3)",
      };
    default:
      return {
        bg: "rgba(100, 116, 139, 0.12)",
        text: "var(--text-secondary)",
        border: "rgba(100, 116, 139, 0.3)",
      };
  }
}

const Customers = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");

  const customers = useMemo<CustomerRow[]>(() => {
    const byEmail = new Map<
      string,
      CustomerRow & { _lastCreatedValue: number }
    >();

    for (const s of SHIPMENTS_TABLE_ROWS) {
      const key = (s.email || s.customer).toLowerCase();
      const createdValue = safeDateValue(s.created);

      const existing = byEmail.get(key);
      const active = isActiveShipment(s.status) ? 1 : 0;

      if (!existing) {
        byEmail.set(key, {
          key,
          name: s.customer,
          email: s.email,
          phone: s.phone,
          totalShipments: 1,
          activeShipments: active,
          lastShipmentId: s.id,
          lastShipmentStatus: s.status,
          lastShipmentCreated: s.created,
          _lastCreatedValue: createdValue,
        });
        continue;
      }

      existing.totalShipments += 1;
      existing.activeShipments += active;

      if (createdValue >= existing._lastCreatedValue) {
        existing._lastCreatedValue = createdValue;
        existing.lastShipmentId = s.id;
        existing.lastShipmentStatus = s.status;
        existing.lastShipmentCreated = s.created;
      }
    }

    return Array.from(byEmail.values())
      .sort((a, b) => b._lastCreatedValue - a._lastCreatedValue)
      .map(({ _lastCreatedValue, ...rest }) => rest);
  }, []);

  const stats = useMemo(() => {
    const total = customers.length;
    const active = customers.filter((c) => c.activeShipments > 0).length;
    const delivered = customers.filter(
      (c) => c.lastShipmentStatus.toLowerCase() === "delivered"
    ).length;

    return { total, active, delivered };
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return customers.filter((c) => {
      const matchesQuery =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "All" || c.lastShipmentStatus === statusFilter;

      return matchesQuery && matchesStatus;
    });
  }, [customers, searchQuery, statusFilter]);

  return (
    <Sidebar>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1
            className="text-3xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            Customers
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Search customers and jump straight into their shipments.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[
            { title: "Total Customers", value: stats.total, icon: Users },
            { title: "Active Customers", value: stats.active, icon: Package },
            {
              title: "Last Status Delivered",
              value: stats.delivered,
              icon: CheckCircle,
            },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="p-6 rounded-xl border"
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  borderColor: "var(--border-medium)",
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p
                      className="text-sm font-medium"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {card.title}
                    </p>
                    <p
                      className="text-2xl font-bold mt-2"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {card.value}
                    </p>
                  </div>
                  <div
                    className="h-12 w-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: "rgba(46, 196, 182, 0.12)" }}
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

        {/* Controls */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div
            className="flex-1 relative rounded-lg border overflow-hidden"
            style={{
              backgroundColor: "var(--bg-secondary)",
              borderColor: "var(--border-medium)",
            }}
          >
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5"
              style={{ color: "var(--text-secondary)" }}
            />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-transparent outline-none"
              style={{ color: "var(--text-primary)" }}
            />
            <style>{`input::placeholder { color: var(--text-secondary); }`}</style>
          </div>

          <div className="flex gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="px-4 py-3 rounded-lg border outline-none"
              style={{
                backgroundColor: "var(--bg-secondary)",
                borderColor: "var(--border-medium)",
                color: "var(--text-primary)",
              }}
            >
              {statusOrder.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2
              className="text-xl font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              All Customers
            </h2>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {filteredCustomers.length} result(s)
            </p>
          </div>

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
                    className="px-6 py-4 font-semibold"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Customer
                  </th>
                  <th
                    className="px-6 py-4 font-semibold"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Contact
                  </th>
                  <th
                    className="px-6 py-4 font-semibold"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Shipments
                  </th>
                  <th
                    className="px-6 py-4 font-semibold"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Last Status
                  </th>
                  <th
                    className="px-6 py-4 font-semibold"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Last Shipment
                  </th>
                  <th
                    className="px-6 py-4 font-semibold"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredCustomers.map((c, idx) => {
                  const statusColor = getStatusPillColors(c.lastShipmentStatus);
                  return (
                    <tr
                      key={c.key}
                      className="border-b hover:bg-opacity-50 transition-colors"
                      style={{
                        borderColor: "var(--border-medium)",
                        backgroundColor:
                          idx % 2 === 0
                            ? "rgba(46, 196, 182, 0.03)"
                            : "transparent",
                      }}
                      onClick={() =>
                        navigate(
                          `/shipments?customer=${encodeURIComponent(c.name)}`
                        )
                      }
                    >
                      <td
                        className="px-6 py-4"
                        style={{ color: "var(--text-primary)" }}
                      >
                        <div className="font-semibold">{c.name}</div>
                        <div
                          className="text-xs"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {c.email}
                        </div>
                      </td>

                      <td
                        className="px-6 py-4"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {c.phone}
                      </td>

                      <td className="px-6 py-4">
                        <div style={{ color: "var(--text-primary)" }}>
                          {c.totalShipments}
                        </div>
                        <div
                          className="text-xs"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {c.activeShipments} active
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className="inline-block px-3 py-1 rounded-full text-xs font-medium border"
                          style={{
                            backgroundColor: statusColor.bg,
                            color: statusColor.text,
                            borderColor: statusColor.border,
                          }}
                        >
                          {c.lastShipmentStatus}
                        </span>
                      </td>

                      <td
                        className="px-6 py-4"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        <div style={{ color: "var(--text-primary)" }}>
                          {c.lastShipmentId}
                        </div>
                        <div className="text-xs">{c.lastShipmentCreated}</div>
                      </td>

                      <td className="px-6 py-4">
                        <div
                          className="flex items-center gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() =>
                              navigate(
                                `/shipments?customer=${encodeURIComponent(
                                  c.name
                                )}`
                              )
                            }
                            className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                            style={{
                              backgroundColor: "rgba(46, 196, 182, 0.12)",
                              color: "var(--accent-teal)",
                              border: "1px solid rgba(46, 196, 182, 0.25)",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor =
                                "rgba(46, 196, 182, 0.18)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor =
                                "rgba(46, 196, 182, 0.12)";
                            }}
                          >
                            Shipments
                          </button>

                          <button
                            onClick={() =>
                              navigate(
                                `/shipments?customer=${encodeURIComponent(
                                  c.name
                                )}&open=${encodeURIComponent(c.lastShipmentId)}`
                              )
                            }
                            className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                            style={{
                              backgroundColor: "transparent",
                              color: "var(--text-secondary)",
                              border: "1px solid var(--border-medium)",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor =
                                "var(--bg-tertiary)";
                              e.currentTarget.style.color =
                                "var(--text-primary)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor =
                                "transparent";
                              e.currentTarget.style.color =
                                "var(--text-secondary)";
                            }}
                          >
                            Open Latest
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredCustomers.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-10 text-center"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      No customers match your search/filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Sidebar>
  );
};

export default Customers;
