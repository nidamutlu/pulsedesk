package com.pulsedesk.dashboard.service;

import com.pulsedesk.dashboard.api.dto.DailyTicketCountResponse;
import com.pulsedesk.dashboard.api.dto.DashboardSummaryResponse;
import com.pulsedesk.ticket.domain.TicketPriority;
import com.pulsedesk.ticket.domain.TicketStatus;
import com.pulsedesk.ticket.repository.TicketRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final TicketRepository ticketRepository;

    public DashboardSummaryResponse getSummary() {
        Map<String, Long> statusCounts = buildStatusCounts();
        Map<String, Long> priorityCounts = buildPriorityCounts();
        Double averageResolutionHours = buildAverageResolutionHours();
        List<DailyTicketCountResponse> last7DaysCreated = buildLast7DaysCreated();

        return new DashboardSummaryResponse(
                statusCounts,
                priorityCounts,
                averageResolutionHours,
                last7DaysCreated
        );
    }

    private Map<String, Long> buildStatusCounts() {
        Map<String, Long> statusCounts = new LinkedHashMap<>();

        for (TicketStatus status : TicketStatus.values()) {
            statusCounts.put(status.name(), ticketRepository.countByStatus(status));
        }

        return statusCounts;
    }

    private Map<String, Long> buildPriorityCounts() {
        Map<String, Long> priorityCounts = new LinkedHashMap<>();

        for (TicketPriority priority : TicketPriority.values()) {
            priorityCounts.put(priority.name(), ticketRepository.countByPriority(priority));
        }

        return priorityCounts;
    }

    private Double buildAverageResolutionHours() {
        Double avg = ticketRepository.calculateAverageResolutionHours();
        if (avg == null) {
            return null;
        }
        return Math.round(avg * 10.0) / 10.0;
    }

    private List<DailyTicketCountResponse> buildLast7DaysCreated() {
        LocalDate today = LocalDate.now();
        Map<LocalDate, Long> trend = new LinkedHashMap<>();

        for (int i = 6; i >= 0; i--) {
            trend.put(today.minusDays(i), 0L);
        }

        List<Object[]> rows = ticketRepository.countCreatedTicketsLast7DaysRaw();

        for (Object[] row : rows) {
            LocalDate date = extractLocalDate(row[0]);
            Long total = ((Number) row[1]).longValue();

            if (trend.containsKey(date)) {
                trend.put(date, total);
            }
        }

        List<DailyTicketCountResponse> result = new ArrayList<>();

        for (Map.Entry<LocalDate, Long> entry : trend.entrySet()) {
            result.add(new DailyTicketCountResponse(entry.getKey(), entry.getValue()));
        }

        return result;
    }

    private LocalDate extractLocalDate(Object value) {
        if (value instanceof LocalDate localDate) {
            return localDate;
        }
        if (value instanceof java.sql.Date sqlDate) {
            return sqlDate.toLocalDate();
        }
        return LocalDate.parse(String.valueOf(value));
    }
}