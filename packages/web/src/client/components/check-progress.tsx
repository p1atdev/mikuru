/** @jsxImportSource react */

import { LayerCard, Meter, Text } from "@cloudflare/kumo";
import type { CheckProgress } from "../lib/api";

interface CheckProgressCardProps {
  progress: CheckProgress;
}

export function CheckProgressCard({ progress }: CheckProgressCardProps) {
  return (
    <LayerCard
      aria-label="Check progress"
      aria-live="polite"
      className="space-y-3 p-4"
      role="status"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <Text as="h2" variant="heading3">
            Checking profiles
          </Text>
          <Text size="sm" variant="secondary">
            Batch {progress.currentBatch} of {progress.totalBatches}
          </Text>
        </div>
        <Text variant="mono-secondary">
          {progress.completedChecks}/{progress.totalChecks}
        </Text>
      </div>

      <Meter
        customValue={`${progress.completedChecks} of ${progress.totalChecks}`}
        label="Checks completed"
        max={Math.max(progress.totalChecks, 1)}
        value={progress.completedChecks}
      />

      <Text size="sm" variant="secondary">
        Results appear below as each profile check finishes.
      </Text>
    </LayerCard>
  );
}
