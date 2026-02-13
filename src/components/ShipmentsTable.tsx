import React, { useEffect, useRef, useState } from "react";
import { MoreVertical, Eye, Edit, Trash2 } from "lucide-react";

interface ShipmentsTableProps {
  filteredShipments: any[];
  onViewDetails: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export const ShipmentsTable: React.FC<ShipmentsTableProps> = ({
  filteredShipments,
  onViewDetails,
  onEdit,
  onDelete,
}) => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const getStatusColor = (status: string) => {
    const statusMap: Record<
      string,
      { bg: string; text: string; label: string }
    > = {
      pending: {
        bg: "rgba(153, 153, 153, 0.12)",
        text: "var(--status-pending)",
        label: "Pending",
      },
      "in-transit": {
        bg: "rgba(102, 102, 102, 0.12)",
        text: "var(--status-in-transit)",
        label: "In Transit",
      },
      delivered: {
        bg: "rgba(34, 34, 34, 0.12)",
        text: "var(--status-delivered)",
        label: "Delivered",
      },
      failed: {
        bg: "rgba(0, 0, 0, 0.12)",
        text: "var(--status-failed)",
        label: "Failed",
      },
    };

    return statusMap[status?.toLowerCase()] || statusMap.pending;
  };

  // Close dropdown on outside pointerdown (more reliable than click)
  useEffect(() => {
    if (!openMenu) return;

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setOpenMenu(null);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenu(null);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openMenu]);

  return (
    <div
      className="rounded-xl border overflow-hidden table-container"
      style={{
        backgroundColor: "var(--bg-secondary)",
        borderColor: "var(--border-medium)",
        boxShadow: "var(--shadow-soft)",
      }}
    >
      <div className="overflow-x-auto">
        <table className="w-full shipments-table">
          <thead>
            <tr
              className="table-header-row"
              style={{
                borderBottom: "2px solid var(--border-medium)",
                background: "var(--gradient-surface)",
              }}
            >
              {[
                "Tracking ID",
                "Customer",
                "Phone",
                "Route",
                "Service",
                "Status",
                "Created",
              ].map((h) => (
                <th
                  key={h}
                  className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {h}
                </th>
              ))}
              <th
                className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider"
                style={{ color: "var(--text-tertiary)" }}
              >
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {filteredShipments.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div
                      className="h-16 w-16 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: "var(--bg-overlay)" }}
                    >
                      <svg
                        className="h-8 w-8"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                        />
                      </svg>
                    </div>
                    <div>
                      <p
                        className="text-base font-semibold mb-1"
                        style={{ color: "var(--text-primary)" }}
                      >
                        No shipments found
                      </p>
                      <p
                        className="text-sm"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Try adjusting your search or filters
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              filteredShipments.map((shipment: any, idx: number) => {
                const statusColor = getStatusColor(shipment.status);

                const isOpen = openMenu === shipment.id;

                return (
                  <tr
                    key={shipment.id}
                    className="table-row group"
                    onClick={() => onViewDetails?.(shipment.id)}
                    style={{
                      borderBottom:
                        idx < filteredShipments.length - 1
                          ? "1px solid var(--border-soft)"
                          : "none",
                    }}
                  >
                    <td
                      className="px-6 py-4 text-sm font-bold tracking-wide"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {shipment.id}
                    </td>

                    <td className="px-6 py-4">
                      <div
                        className="font-semibold text-sm mb-0.5"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {shipment.customer}
                      </div>
                      <div
                        className="text-xs font-medium"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {shipment.email}
                      </div>
                    </td>

                    <td
                      className="px-6 py-4 text-sm font-medium"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {shipment.phone}
                    </td>

                    <td className="px-6 py-4">
                      <div
                        className="text-sm font-medium"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {shipment.route}
                      </div>
                    </td>

                    <td
                      className="px-6 py-4 text-sm font-medium"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {shipment.service}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className="status-badge px-3 py-1.5 rounded-full text-xs font-bold inline-block border"
                        style={{
                          backgroundColor: statusColor.bg,
                          color: statusColor.text,
                          borderColor: statusColor.text + "20",
                        }}
                      >
                        {statusColor.label}
                      </span>
                    </td>

                    <td
                      className="px-6 py-4 text-sm font-medium"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {shipment.created}
                    </td>

                    {/* Actions column: prevent row click/hover from fighting dropdown */}
                    <td
                      className="px-6 py-4 text-center relative actions-cell"
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        aria-haspopup="menu"
                        aria-expanded={isOpen}
                        onClick={() => setOpenMenu(isOpen ? null : shipment.id)}
                        className="action-button p-2.5 rounded-lg transition-all inline-flex items-center justify-center"
                        style={{
                          backgroundColor: "var(--bg-overlay)",
                          color: "var(--text-secondary)",
                        }}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>

                      {isOpen && (
                        <div
                          ref={menuRef}
                          className="dropdown-menu absolute right-0 top-full mt-2 w-52 rounded-xl border overflow-hidden z-50 animate-slideDown"
                          style={{
                            backgroundColor: "var(--bg-primary)",
                            borderColor: "var(--border-medium)",
                            boxShadow: "var(--shadow-strong)",
                          }}
                          role="menu"
                        >
                          <button
                            type="button"
                            role="menuitem"
                            className="dropdown-item w-full text-left px-4 py-3 text-sm font-semibold transition-all flex items-center gap-3"
                            style={{
                              color: "var(--text-primary)",
                              backgroundColor: "transparent",
                            }}
                            onClick={() => {
                              setOpenMenu(null);
                              onViewDetails?.(shipment.id);
                            }}
                          >
                            <Eye
                              className="h-4 w-4"
                              style={{ color: "var(--text-secondary)" }}
                            />
                            View Details
                          </button>

                          <button
                            type="button"
                            role="menuitem"
                            className="dropdown-item w-full text-left px-4 py-3 text-sm font-semibold transition-all flex items-center gap-3"
                            style={{
                              color: "var(--text-primary)",
                              backgroundColor: "transparent",
                              borderTop: "1px solid var(--border-soft)",
                            }}
                            onClick={() => {
                              setOpenMenu(null);
                              onEdit?.(shipment.id);
                            }}
                          >
                            <Edit
                              className="h-4 w-4"
                              style={{ color: "var(--text-secondary)" }}
                            />
                            Edit Shipment
                          </button>

                          <button
                            type="button"
                            role="menuitem"
                            className="dropdown-item danger w-full text-left px-4 py-3 text-sm font-semibold transition-all flex items-center gap-3"
                            style={{
                              color: "var(--status-failed)",
                              backgroundColor: "transparent",
                              borderTop: "1px solid var(--border-soft)",
                            }}
                            onClick={() => {
                              setOpenMenu(null);
                              onDelete?.(shipment.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <style>{`
        .table-container { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }

        .table-header-row th { position: relative; user-select: none; }
        .table-header-row th::after {
          content: "";
          position: absolute; bottom: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, var(--border-medium) 20%, var(--border-medium) 80%, transparent);
          opacity: 0.5;
        }

        .table-row { position: relative; transition: background-color 0.2s cubic-bezier(0.4,0,0.2,1); cursor: pointer; }
        .table-row::before {
          content: ""; position: absolute; left: 0; top: 0; bottom: 0;
          width: 3px; background: var(--text-primary);
          transform: scaleY(0);
          transition: transform 0.2s cubic-bezier(0.4,0,0.2,1);
        }
        .table-row:hover { background-color: var(--hover-overlay); }
        .table-row:hover::before { transform: scaleY(1); }
        .table-row:hover td:first-child { padding-left: 30px; }
        .table-row td { transition: padding 0.2s cubic-bezier(0.4,0,0.2,1); }

        /* IMPORTANT: when dropdown is open, stop the row hover vibe from feeling "stronger" */
        .actions-cell { cursor: default; }
        .actions-cell * { cursor: default; }

        .status-badge { transition: transform 0.2s cubic-bezier(0.4,0,0.2,1); letter-spacing: 0.05em; }
        .status-badge:hover { transform: scale(1.05); box-shadow: 0 2px 8px rgba(0,0,0,0.12); }

        .action-button { position: relative; overflow: hidden; }
        .action-button:hover { background-color: var(--bg-tertiary) !important; transform: scale(1.05); }
        .action-button:focus-visible {
          outline: 2px solid var(--border-strong);
          outline-offset: 3px;
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slideDown { animation: slideDown 0.2s cubic-bezier(0.16, 1, 0.3, 1); }

        .dropdown-menu { backdrop-filter: blur(10px); transform: translateZ(0); }
        .dropdown-item { position: relative; overflow: hidden; }
        .dropdown-item::before {
          content: "";
          position: absolute; left: 0; top: 0; bottom: 0;
          width: 3px; background: var(--text-primary);
          transform: scaleY(0);
          transition: transform 0.2s cubic-bezier(0.4,0,0.2,1);
        }
        .dropdown-item:hover,
        .dropdown-item:focus-visible {
          background-color: var(--hover-overlay);
          padding-left: 20px;
          outline: none;
        }
        .dropdown-item:hover::before,
        .dropdown-item:focus-visible::before { transform: scaleY(1); }

        .dropdown-item.danger:hover,
        .dropdown-item.danger:focus-visible {
          background-color: rgba(255, 0, 0, 0.08);
        }

        @media (max-width: 1024px) {
          .table-row:hover td:first-child { padding-left: 24px; }
        }

        .overflow-x-auto::-webkit-scrollbar { height: 8px; }
        .overflow-x-auto::-webkit-scrollbar-track { background: var(--bg-tertiary); border-radius: 4px; }
        .overflow-x-auto::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 4px; transition: background 0.2s; }
        .overflow-x-auto::-webkit-scrollbar-thumb:hover { background: var(--text-tertiary); }
      `}</style>
    </div>
  );
};
