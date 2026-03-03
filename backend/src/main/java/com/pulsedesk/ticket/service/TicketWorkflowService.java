package com.pulsedesk.ticket.service;

import com.pulsedesk.ticket.domain.Ticket;
import com.pulsedesk.ticket.domain.TicketAuditLog;
import com.pulsedesk.ticket.domain.TicketStatus;
import com.pulsedesk.ticket.exception.TicketNotFoundException;
import com.pulsedesk.ticket.exception.TicketTransitionInvalidException;
import com.pulsedesk.ticket.repository.TicketAuditLogRepository;
import com.pulsedesk.ticket.repository.TicketRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

@Service
public class TicketWorkflowService {

    private final TicketRepository ticketRepository;
    private final TicketAuditLogRepository auditLogRepository;

    public TicketWorkflowService(TicketRepository ticketRepository, TicketAuditLogRepository auditLogRepository) {
        this.ticketRepository = ticketRepository;
        this.auditLogRepository = auditLogRepository;
    }

    @Transactional
    public Ticket transition(Long ticketId, TicketStatus toStatus, Long actorId) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new TicketNotFoundException(ticketId));

        TicketStatus from = ticket.getStatus();

        if (!from.canTransitionTo(toStatus)) {
            String transition = from.name() + " -> " + toStatus.name();
            throw new TicketTransitionInvalidException(ticketId, transition);
        }

        ticket.setStatus(toStatus);
        ticket.setUpdatedAt(OffsetDateTime.now());

        if (toStatus == TicketStatus.RESOLVED) {
            ticket.setResolvedAt(OffsetDateTime.now());
        } else if (from == TicketStatus.RESOLVED) {
            ticket.setResolvedAt(null);
        }

        Ticket saved = ticketRepository.save(ticket);
        auditLogRepository.save(TicketAuditLog.statusChange(saved.getId(), from, toStatus, actorId));

        return saved;
    }
}