package com.pulsedesk.ticket.api.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.pulsedesk.ticket.domain.TicketPriority;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import static com.fasterxml.jackson.annotation.JsonInclude.Include.NON_NULL;

@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(NON_NULL)
public class TicketRequest {

    private String title;
    private String description;
    private TicketPriority priority;
    private Long assigneeId;
    private Long teamId;
}