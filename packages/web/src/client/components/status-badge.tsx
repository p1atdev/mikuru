/** @jsxImportSource react */

import { Badge } from "@cloudflare/kumo";
import type { AccountStatus } from "core/src/types";
import { statusBadgeVariant, statusLabel } from "../lib/status";

interface StatusBadgeProps {
  status: AccountStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <Badge appearance="dot" variant={statusBadgeVariant(status)}>
      {statusLabel(status)}
    </Badge>
  );
}
