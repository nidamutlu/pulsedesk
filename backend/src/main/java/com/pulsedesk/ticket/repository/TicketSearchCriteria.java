package com.pulsedesk.ticket.repository;

import com.pulsedesk.ticket.domain.TicketPriority;
import com.pulsedesk.ticket.domain.TicketStatus;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class TicketSearchCriteria {
    TicketStatus status;
    TicketPriority priority;
    Long assigneeId;
    Long requesterId;
    Long teamId;
    String query;
}