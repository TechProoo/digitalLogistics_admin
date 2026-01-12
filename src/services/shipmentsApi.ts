import { apiClient } from "./apiClient";
import type {
  Shipment,
  ShipmentCheckpoint,
  ShipmentNote,
  ShipmentStatus,
} from "../types/shipment";

export type ListShipmentsParams = {
  customerId?: string;
  status?: ShipmentStatus;
};

export type UpdateShipmentStatusBody = {
  status: ShipmentStatus;
  note?: string;
  adminName?: string;
};

export type AddCheckpointBody = {
  location: string;
  description: string;
  adminName?: string;
};

export type AddNoteBody = {
  text: string;
  adminName?: string;
};

export const shipmentsApi = {
  async list(params?: ListShipmentsParams): Promise<Shipment[]> {
    const res = await apiClient.get<Shipment[]>("/shipments", { params });
    return res.data;
  },

  async getById(id: string): Promise<Shipment> {
    const res = await apiClient.get<Shipment>(`/shipments/${id}`);
    return res.data;
  },

  async updateStatus(
    id: string,
    body: UpdateShipmentStatusBody
  ): Promise<Shipment> {
    const res = await apiClient.patch<Shipment>(
      `/shipments/${id}/status`,
      body
    );
    return res.data;
  },

  async addCheckpoint(
    id: string,
    body: AddCheckpointBody
  ): Promise<ShipmentCheckpoint> {
    const res = await apiClient.post<ShipmentCheckpoint>(
      `/shipments/${id}/checkpoints`,
      body
    );
    return res.data;
  },

  async addNote(id: string, body: AddNoteBody): Promise<ShipmentNote> {
    const res = await apiClient.post<ShipmentNote>(
      `/shipments/${id}/notes`,
      body
    );
    return res.data;
  },

  async remove(id: string): Promise<{ message: string }> {
    const res = await apiClient.delete<{ message: string }>(`/shipments/${id}`);
    return res.data;
  },
};
