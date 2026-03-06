package com.pulsedesk.ticket.service;

import com.pulsedesk.security.AuthPrincipal;
import com.pulsedesk.ticket.api.dto.TicketAuditLogResponse;
import com.pulsedesk.ticket.repository.TicketAuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class TicketAuditService {

    private final TicketAuditLogRepository auditLogRepository;
    private final TicketService ticketService;

    public List<TicketAuditLogResponse> listAuditLogs(AuthPrincipal me, Long ticketId) {
        ticketService.getTicketById(me, ticketId);

        return auditLogRepository
                .findByTicketIdOrderByCreatedAtDesc(ticketId)
                .stream()
                .map(TicketAuditLogResponse::from)
                .toList();
    }
}