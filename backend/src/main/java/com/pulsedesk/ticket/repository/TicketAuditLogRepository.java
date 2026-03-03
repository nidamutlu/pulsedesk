package com.pulsedesk.ticket.repository;

import com.pulsedesk.ticket.domain.TicketAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TicketAuditLogRepository
        extends JpaRepository<TicketAuditLog, Long> {

    List<TicketAuditLog> findByTicketIdOrderByCreatedAtDesc(Long ticketId);
}