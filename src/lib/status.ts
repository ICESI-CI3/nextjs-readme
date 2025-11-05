// lib/status.ts
export type UiStatus = "to-read" | "reading" | "completed";
export type ApiStatus = "pending" | "reading" | "read";

export const uiToApi = (s: UiStatus): ApiStatus =>
  s === "to-read" ? "pending" : s === "completed" ? "read" : "reading";
