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

export function statusBadgeClass(status: AccountStatus): string {
  switch (status) {
    case "found":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/50 dark:text-emerald-300";
    case "not_found":
      return "border-zinc-300 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300";
    case "invalid":
      return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/50 dark:text-amber-300";
    case "blocked":
      return "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/70 dark:bg-violet-950/50 dark:text-violet-300";
    case "unknown":
      return "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/70 dark:bg-indigo-950/50 dark:text-indigo-300";
    case "error":
      return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/50 dark:text-rose-300";
  }
}

export function statusDotClass(status: AccountStatus): string {
  switch (status) {
    case "found":
      return "bg-emerald-500";
    case "not_found":
      return "bg-zinc-500";
    case "invalid":
      return "bg-amber-500";
    case "blocked":
      return "bg-violet-500";
    case "unknown":
      return "bg-indigo-500";
    case "error":
      return "bg-rose-500";
  }
}

export function statusSegmentClass(status: AccountStatus): string {
  switch (status) {
    case "found":
      return "bg-emerald-500";
    case "not_found":
      return "bg-zinc-500";
    case "invalid":
      return "bg-amber-500";
    case "blocked":
      return "bg-violet-500";
    case "unknown":
      return "bg-indigo-500";
    case "error":
      return "bg-rose-500";
  }
}
