package com.pulsedesk.dashboard.api.dto;

import java.time.LocalDate;

public class DailyTicketCountResponse {

    private final LocalDate date;
    private final long count;

    public DailyTicketCountResponse(LocalDate date, long count) {
        this.date = date;
        this.count = count;
    }

    public LocalDate getDate() {
        return date;
    }

    public long getCount() {
        return count;
    }
}