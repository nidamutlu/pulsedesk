package com.pulsedesk.ticket.service;

import com.pulsedesk.ticket.api.dto.TicketAuditLogResponse;
import com.pulsedesk.ticket.exception.TicketNotFoundException;
import com.pulsedesk.ticket.repository.TicketAuditLogRepository;
import com.pulsedesk.ticket.repository.TicketRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class TicketAuditService {

    private final TicketAuditLogRepository auditLogRepository;
    private final TicketRepository ticketRepository;

    public List<TicketAuditLogResponse> listAuditLogs(Long ticketId) {
        if (!ticketRepository.existsById(ticketId)) {
            throw new TicketNotFoundException(ticketId);
        }

        return auditLogRepository
                .findByTicketIdOrderByCreatedAtDesc(ticketId)
                .stream()
                .map(TicketAuditLogResponse::from)
                .toList();
    }
}