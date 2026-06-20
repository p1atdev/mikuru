import type { AccountStatus } from "core/src/types";

export function statusLabel(status: AccountStatus): string {
  switch (status) {
    case "found":
      return "Found";
    case "not_found":
      return "Not found";
    case "invalid":
      return "Invalid";
    case "blocked":
      return "Blocked";
    case "unknown":
      return "Unknown";
    case "error":
      return "Error";
  }
}

export function statusBadgeVariant(
  status: AccountStatus,
): "success" | "neutral" | "warning" | "info" | "error" {
  switch (status) {
    case "found":
      return "success";
    case "not_found":
      return "neutral";
    case "invalid":
    case "blocked":
      return "warning";
    case "unknown":
      return "info";
    case "error":
      return "error";
  }
}
