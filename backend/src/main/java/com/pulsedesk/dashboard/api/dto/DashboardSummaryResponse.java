package com.pulsedesk.dashboard.api.dto;

import java.util.List;
import java.util.Map;

public class DashboardSummaryResponse {

    private final Map<String, Long> statusCounts;
    private final Map<String, Long> priorityCounts;
    private final Double averageResolutionHours;
    private final List<DailyTicketCountResponse> last7DaysCreated;

    public DashboardSummaryResponse(
            Map<String, Long> statusCounts,
            Map<String, Long> priorityCounts,
            Double averageResolutionHours,
            List<DailyTicketCountResponse> last7DaysCreated
    ) {
        this.statusCounts = statusCounts;
        this.priorityCounts = priorityCounts;
        this.averageResolutionHours = averageResolutionHours;
        this.last7DaysCreated = last7DaysCreated;
    }

    public Map<String, Long> getStatusCounts() {
        return statusCounts;
    }

    public Map<String, Long> getPriorityCounts() {
        return priorityCounts;
    }

    public Double getAverageResolutionHours() {
        return averageResolutionHours;
    }

    public List<DailyTicketCountResponse> getLast7DaysCreated() {
        return last7DaysCreated;
    }
}