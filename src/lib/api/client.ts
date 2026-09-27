import axios, { AxiosError } from "axios";

const configuredBackendUrl = process.env.BACKEND_URL ?? "http://localhost:3001";
const apiBaseUrl = configuredBackendUrl.endsWith("/api/v1")
  ? configuredBackendUrl
  : `${configuredBackendUrl.replace(/\/$/, "")}/api/v1`;

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    Accept: "application/json",
  },
  timeout: 15_000,
});


export function isAxiosError(error: unknown): error is AxiosError {
  return axios.isAxiosError(error);
}
