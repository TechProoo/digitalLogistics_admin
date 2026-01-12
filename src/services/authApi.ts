import { apiClient } from "./apiClient";

export type LoginRequest = {
  email: string;
  password: string;
};

export type Customer = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
};

export const authApi = {
  async login(body: LoginRequest): Promise<{ customer: Customer }> {
    const res = await apiClient.post<{ customer: Customer }>(
      "/auth/login",
      body
    );
    return res.data;
  },

  async logout(): Promise<{ ok: boolean }> {
    const res = await apiClient.post<{ ok: boolean }>("/auth/logout");
    return res.data;
  },

  async me(): Promise<Customer> {
    const res = await apiClient.get<Customer>("/auth/me");
    return res.data;
  },
};
