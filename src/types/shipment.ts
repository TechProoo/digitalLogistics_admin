export type Status =
  | "pending"
  | "quoted"
  | "accepted"
  | "picked_up"
  | "in_transit"
  | "delivered"
  | "cancelled";
export type ServiceType = "Road" | "Air" | "Sea" | "Door-to-Door";

export interface StatusHistoryItem {
  status: Status;
  timestamp: string;
  admin: string;
  note?: string;
}

export interface Checkpoint {
  id: string;
  location: string;
  description: string;
  timestamp: string;
  admin: string;
}

export interface Note {
  id: string;
  text: string;
  timestamp: string;
  admin?: string;
}

export interface Shipment {
  id: string;
  trackingId: string;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  route: {
    pickup: string;
    destination: string;
  };
  package: {
    type: string;
    weight: string;
    dimensions: string;
    date: string;
  };
  serviceType: ServiceType;
  currentStatus: Status;
  statusHistory: StatusHistoryItem[];
  checkpoints?: Checkpoint[];
  notes?: Note[];
}

export interface ShipmentTableRow {
  id: string;
  customer: string;
  email: string;
  phone: string;
  service: string;
  status: string;
  created: string;
  pickup?: string;
  destination?: string;
  packageType?: string;
  weight?: string;
  dimensions?: string;
}

export interface ShipmentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  shipmentId: string;
  shipments?: ShipmentTableRow[];
  onUpdate?: () => void;
}

export const STATUS_LABELS: Record<Status, string> = {
  pending: "Pending",
  quoted: "Quoted",
  accepted: "Accepted",
  picked_up: "Picked Up",
  in_transit: "In Transit",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const STATUS_COLORS: Record<
  Status,
  { bg: string; text: string; border: string }
> = {
  pending: {
    bg: "rgba(255, 193, 7, 0.12)",
    text: "#ffc107",
    border: "rgba(255, 193, 7, 0.3)",
  },
  quoted: {
    bg: "rgba(59, 130, 246, 0.12)",
    text: "#3b82f6",
    border: "rgba(59, 130, 246, 0.3)",
  },
  accepted: {
    bg: "rgba(139, 92, 246, 0.12)",
    text: "#8b5cf6",
    border: "rgba(139, 92, 246, 0.3)",
  },
  picked_up: {
    bg: "rgba(236, 72, 153, 0.12)",
    text: "#ec4899",
    border: "rgba(236, 72, 153, 0.3)",
  },
  in_transit: {
    bg: "rgba(46, 196, 182, 0.12)",
    text: "var(--accent-teal)",
    border: "rgba(46, 196, 182, 0.3)",
  },
  delivered: {
    bg: "rgba(34, 197, 94, 0.12)",
    text: "var(--status-success)",
    border: "rgba(34, 197, 94, 0.3)",
  },
  cancelled: {
    bg: "rgba(239, 68, 68, 0.12)",
    text: "#ef4444",
    border: "rgba(239, 68, 68, 0.3)",
  },
};

export const VALID_STATUS_TRANSITIONS: Record<Status, Status[]> = {
  pending: ["quoted", "cancelled"],
  quoted: ["accepted", "cancelled"],
  accepted: ["picked_up", "cancelled"],
  picked_up: ["in_transit", "cancelled"],
  in_transit: ["delivered"],
  delivered: [],
  cancelled: [],
};
