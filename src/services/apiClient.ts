import axios, { AxiosError, type AxiosInstance } from "axios";
import { TOKEN_KEY } from "../auth/AdminAuthContext";

export type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  message?: string;
};

function resolveBaseUrl() {
  const url = (import.meta as any).env?.VITE_API_URL;
  if (typeof url === "string" && url.trim()) return url.trim();
  return url || "http://localhost:3000";
}

export function getApiBaseUrl(): string {
  return resolveBaseUrl();
}

export function getApiErrorMessage(error: unknown): string {
  const err = error as AxiosError<any>;

  if (axios.isAxiosError(err)) {
    const data = err.response?.data;

    if (data && typeof data === "object") {
      if (typeof data.message === "string" && data.message.trim()) {
        return data.message;
      }

      if (Array.isArray(data.message) && data.message.length) {
        return String(data.message[0]);
      }

      if (typeof data.error === "string" && data.error.trim()) {
        return data.error;
      }
    }

    if (typeof err.message === "string" && err.message.trim()) {
      return err.message;
    }
  }

  return "Something went wrong";
}

export function createApiClient(): AxiosInstance {
  const api = axios.create({
    baseURL: resolveBaseUrl(),
    withCredentials: true,
    headers: {
      "Content-Type": "application/json",
    },
  });

  api.interceptors.request.use((config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers = config.headers ?? {};
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  });

  api.interceptors.response.use(
    (response) => {
      const payload = response.data as any;
      if (
        payload &&
        typeof payload === "object" &&
        "success" in payload &&
        "data" in payload
      ) {
        return { ...response, data: (payload as ApiEnvelope<any>).data };
      }
      return response;
    },
    (error) => {
      if ((error as AxiosError)?.response?.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
      return Promise.reject(error);
    },
  );

  return api;
}

export const apiClient = createApiClient();
