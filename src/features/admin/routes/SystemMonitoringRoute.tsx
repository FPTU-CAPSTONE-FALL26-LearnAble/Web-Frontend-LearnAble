import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Gauge,
  Pause,
  Play,
  RefreshCw,
  ServerCrash,
  Timer,
  Users,
} from "lucide-react";
import { getSystemHealth } from "@/api/adminSystem";
import { Button } from "@/shared/ui/primitives/button";
import { Card, CardContent } from "@/shared/ui/primitives/card";
import { Progress } from "@/shared/ui/primitives/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/primitives/table";
import {
  PageHeading,
  ReadState,
  SummaryCard,
} from "@/components/workbench/Workbench";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import { adminKeys, useExpiredAdminSession } from "../api/useAdminData";
import {
  HealthBadge,
  formatDateTime,
  metric,
} from "../components/SystemSurfaces";

/** Refresh cadence while live updates are on. */
export const MONITORING_REFRESH_MS = 30_000;

/** FR-28 — performance, availability and usage (FFCB-152). */
export function SystemMonitoringRoute() {
  useRouteAnnouncer("System monitoring · LearnAble Admin", "System monitoring");
  // WCAG 2.2.2: content that updates on its own must be pausable.
  const [live, setLive] = useState(true);
  const health = useQuery({
    queryKey: adminKeys.list("system-health", ["monitoring"]),
    queryFn: getSystemHealth,
    refetchInterval: live ? MONITORING_REFRESH_MS : false,
  });
  useExpiredAdminSession(health.error);
  const data = health.data;
  const storagePercent =
    data?.usage.storageUsedGb != null && data.usage.storageQuotaGb
      ? Math.min(
          100,
          Math.round((data.usage.storageUsedGb / data.usage.storageQuotaGb) * 100),
        )
      : null;

  return (
    <div className="space-y-6">
      <PageHeading
        title="System monitoring"
        description="Service health, response times and current usage across every university."
      >
        <Button
          variant="outline"
          aria-pressed={live}
          onClick={() => setLive((value) => !value)}
        >
          {live ? <Pause aria-hidden /> : <Play aria-hidden />}
          {live ? "Pause live updates" : "Resume live updates"}
        </Button>
        <Button
          onClick={() => void health.refetch()}
          disabled={health.isFetching}
        >
          <RefreshCw
            aria-hidden
            className={
              health.isFetching
                ? "animate-spin motion-reduce:animate-none"
                : undefined
            }
          />
          Refresh now
        </Button>
      </PageHeading>

      {(health.isPending || health.error) && (
        <ReadState
          pending={health.isPending}
          error={health.error}
          retry={() => void health.refetch()}
        />
      )}

      {data && (
        <>
          <Card className="admin-panel shadow-none">
            <CardContent className="pt-6">
              <p className="admin-kicker">Overall status</p>
              <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-3">
                <HealthBadge status={data.status} />
                <p className="text-sm text-muted-foreground">
                  Last checked {formatDateTime(data.checkedAt)}.{" "}
                  {live
                    ? `Updates every ${MONITORING_REFRESH_MS / 1000} seconds.`
                    : "Live updates are paused."}
                </p>
              </div>
            </CardContent>
          </Card>

          <section aria-labelledby="performance-heading" className="space-y-3">
            <h2 id="performance-heading" className="text-lg font-bold">
              Performance and availability
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                label="Availability (30 days)"
                value={metric(data.uptimePercent30d, "%", 2)}
                detail="Share of time the API answered health checks"
                icon={<Activity aria-hidden className="size-5" />}
              />
              <SummaryCard
                label="Average response"
                value={metric(data.performance.averageResponseMs, " ms")}
                detail={`95th percentile: ${metric(data.performance.p95ResponseMs, " ms")}`}
                icon={<Timer aria-hidden className="size-5" />}
              />
              <SummaryCard
                label="Error rate"
                value={metric(data.performance.errorRatePercent, "%", 2)}
                detail="Requests answered with a server error"
                icon={<ServerCrash aria-hidden className="size-5" />}
              />
              <SummaryCard
                label="Requests per minute"
                value={metric(data.performance.requestsPerMinute)}
                detail="Average over the last five minutes"
                icon={<Gauge aria-hidden className="size-5" />}
              />
            </div>
          </section>

          <section className="min-w-0 overflow-hidden rounded-2xl border border-border">
            <div className="border-b border-border p-5">
              <h2 className="text-lg font-bold">Services</h2>
            </div>
            <Table containerLabel="Service health table">
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Latency</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.services.map((service) => (
                  <TableRow key={service.name}>
                    <TableCell className="font-bold">{service.name}</TableCell>
                    <TableCell>
                      <HealthBadge status={service.status} />
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {metric(service.latencyMs, " ms")}
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      {service.message ?? "No issues reported"}
                    </TableCell>
                  </TableRow>
                ))}
                {!data.services.length && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center">
                      No services reported by the health check.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </section>

          <section aria-labelledby="usage-heading" className="space-y-3">
            <h2 id="usage-heading" className="text-lg font-bold">
              Usage right now
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                label="Signed-in users"
                value={metric(data.usage.activeUsers)}
                detail="Sessions active in the last 15 minutes"
                icon={<Users aria-hidden className="size-5" />}
              />
              <SummaryCard
                label="Exam sessions in progress"
                value={metric(data.usage.activeExamSessions)}
                detail="Students currently taking an exam"
                icon={<Timer aria-hidden className="size-5" />}
              />
              <SummaryCard
                label="Active universities"
                value={metric(data.usage.activeUniversities)}
                detail="Tenants with at least one active session"
                icon={<Activity aria-hidden className="size-5" />}
              />
              <Card className="min-w-0 border-border py-0 shadow-none">
                <CardContent className="space-y-3 py-5">
                  <p className="text-sm font-semibold text-muted-foreground">
                    Storage used
                  </p>
                  <p className="text-xl font-extrabold tabular-nums sm:text-2xl">
                    {metric(data.usage.storageUsedGb, " GB", 1)}
                    <span className="text-sm font-semibold text-muted-foreground">
                      {" "}
                      of {metric(data.usage.storageQuotaGb, " GB")}
                    </span>
                  </p>
                  {storagePercent !== null && (
                    <Progress
                      value={storagePercent}
                      aria-label={`Storage used: ${storagePercent}%`}
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
