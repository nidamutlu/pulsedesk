import { http } from "./http";

export type DashboardStatusCounts = {
  OPEN: number;
  IN_PROGRESS: number;
  WAITING_CUSTOMER: number;
  RESOLVED: number;
  CLOSED: number;
};

export type DashboardPriorityCounts = {
  LOW?: number;
  MEDIUM?: number;
  HIGH?: number;
};

export type DailyTicketCount = {
  date: string;
  count: number;
};

export type DashboardSummary = {
  statusCounts: DashboardStatusCounts;
  priorityCounts?: DashboardPriorityCounts;
  averageResolutionHours: number | null;
  last7DaysCreated: DailyTicketCount[];
};

export function fetchDashboardSummary(): Promise<DashboardSummary> {
  return http<DashboardSummary>("/dashboard/summary");
}