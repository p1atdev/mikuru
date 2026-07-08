/** @jsxImportSource react */

import type { AccountStatus } from "core/src/types";
import { statusBadgeClass, statusDotClass, statusLabel } from "../lib/status";

interface StatusBadgeProps {
  status: AccountStatus;
  count?: number;
}

export function StatusBadge({ count, status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex min-h-6 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(status)}`}
    >
      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${statusDotClass(status)}`} />
      <span>{statusLabel(status)}</span>
      {count !== undefined ? <span className="tabular-nums">{count}</span> : null}
    </span>
  );
}
