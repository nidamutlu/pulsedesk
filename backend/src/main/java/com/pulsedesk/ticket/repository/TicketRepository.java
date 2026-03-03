package com.pulsedesk.ticket.repository;

import com.pulsedesk.ticket.domain.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface TicketRepository
        extends JpaRepository<Ticket, Long>,
        JpaSpecificationExecutor<Ticket> {
}