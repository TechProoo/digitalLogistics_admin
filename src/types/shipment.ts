export type ShipmentStatus =
  | "PENDING"
  | "QUOTED"
  | "ACCEPTED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "CANCELLED";

export type ServiceType = "ROAD" | "AIR" | "SEA" | "DOOR_TO_DOOR";

export type CustomerPublic = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
};

export type ShipmentStatusHistoryItem = {
  id: string;
  shipmentId: string;
  status: ShipmentStatus;
  timestamp: string;
  adminName?: string | null;
  note?: string | null;
};

export type ShipmentCheckpoint = {
  id: string;
  shipmentId: string;
  location: string;
  description: string;
  timestamp: string;
  adminName?: string | null;
};

export type ShipmentNote = {
  id: string;
  shipmentId: string;
  text: string;
  timestamp: string;
  adminName?: string | null;
};

export type Shipment = {
  id: string;
  trackingId: string;
  customerId: string;
  customer: CustomerPublic;
  serviceType: ServiceType;
  status: ShipmentStatus;

  pickupLocation: string;
  destinationLocation: string;

  packageType: string;
  weight: string;
  dimensions: string;
  phone: string;
  receiverPhone?: string | null;

  createdAt: string;
  updatedAt: string;

  statusHistory: ShipmentStatusHistoryItem[];
  checkpoints: ShipmentCheckpoint[];
  notes: ShipmentNote[];
};

export type ShipmentTableRow = {
  id: string; // database id
  trackingId: string;
  customer: string;
  email: string;
  phone: string;
  route: string;
  service: string;
  status: string;
  statusRaw: ShipmentStatus;
  created: string;
};

export type ShipmentDetailsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  shipmentId: string;
  onUpdate?: () => void;
};

export const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
  PENDING: "Pending",
  QUOTED: "Quoted",
  ACCEPTED: "Accepted",
  PICKED_UP: "Picked Up",
  IN_TRANSIT: "In Transit",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export const SHIPMENT_STATUS_COLORS: Record<
  ShipmentStatus,
  { bg: string; text: string; border: string }
> = {
  PENDING: {
    bg: "rgba(255, 193, 7, 0.12)",
    text: "#ffc107",
    border: "rgba(255, 193, 7, 0.3)",
  },
  QUOTED: {
    bg: "rgba(59, 130, 246, 0.12)",
    text: "#3b82f6",
    border: "rgba(59, 130, 246, 0.3)",
  },
  ACCEPTED: {
    bg: "rgba(139, 92, 246, 0.12)",
    text: "#8b5cf6",
    border: "rgba(139, 92, 246, 0.3)",
  },
  PICKED_UP: {
    bg: "rgba(236, 72, 153, 0.12)",
    text: "#ec4899",
    border: "rgba(236, 72, 153, 0.3)",
  },
  IN_TRANSIT: {
    bg: "rgba(46, 196, 182, 0.12)",
    text: "var(--accent-teal)",
    border: "rgba(46, 196, 182, 0.3)",
  },
  DELIVERED: {
    bg: "rgba(34, 197, 94, 0.12)",
    text: "var(--status-success)",
    border: "rgba(34, 197, 94, 0.3)",
  },
  CANCELLED: {
    bg: "rgba(239, 68, 68, 0.12)",
    text: "#ef4444",
    border: "rgba(239, 68, 68, 0.3)",
  },
};

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  ROAD: "Road Freight",
  AIR: "Air Freight",
  SEA: "Sea Freight",
  DOOR_TO_DOOR: "Door-to-Door",
};

export const VALID_STATUS_TRANSITIONS: Record<
  ShipmentStatus,
  ShipmentStatus[]
> = {
  PENDING: ["QUOTED", "CANCELLED"],
  QUOTED: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["PICKED_UP", "CANCELLED"],
  PICKED_UP: ["IN_TRANSIT", "CANCELLED"],
  IN_TRANSIT: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

export function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  const t = d.getTime();
  if (!Number.isFinite(t)) return ts;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
