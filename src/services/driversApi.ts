import { apiClient } from "./apiClient";
import type {
  DriverApplication,
  DriverApplicationStatus,
  DriverStatus,
  VehicleType,
} from "../types/driver";

export type ListApplicationsParams = {
  status?: DriverApplicationStatus;
  vehicleType?: VehicleType;
};

export type ListDirectoryParams = {
  status?: DriverStatus;
};

export type ListAvailableParams = {
  vehicleType?: VehicleType;
};

export const driversApi = {
  async list(): Promise<DriverApplication[]> {
    const res = await apiClient.get<DriverApplication[]>("/drivers");
    return res.data;
  },

  async listApplications(
    params?: ListApplicationsParams,
  ): Promise<DriverApplication[]> {
    const res = await apiClient.get<DriverApplication[]>(
      "/drivers/applications/inbox",
      { params },
    );
    return res.data;
  },

  async listDirectory(params?: ListDirectoryParams): Promise<DriverApplication[]> {
    const res = await apiClient.get<DriverApplication[]>("/drivers/directory", {
      params,
    });
    return res.data;
  },

  async listAvailable(params?: ListAvailableParams): Promise<DriverApplication[]> {
    const res = await apiClient.get<DriverApplication[]>("/drivers/available", {
      params,
    });
    return res.data;
  },

  async updateApplicationStatus(
    id: string,
    status: DriverApplicationStatus,
  ): Promise<DriverApplication> {
    const res = await apiClient.patch<DriverApplication>(
      `/drivers/${id}/application-status`,
      { status },
    );
    return res.data;
  },

  async updateDriverStatus(id: string, status: DriverStatus): Promise<DriverApplication> {
    const res = await apiClient.patch<DriverApplication>(`/drivers/${id}/status`, {
      status,
    });
    return res.data;
  },

  async getById(id: string): Promise<DriverApplication> {
    const res = await apiClient.get<DriverApplication>(`/drivers/${id}`);
    return res.data;
  },
};
