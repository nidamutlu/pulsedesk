package com.pulsedesk.backend.repository;

import com.pulsedesk.backend.domain.ticket.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TicketRepository extends JpaRepository<Ticket, Long> {
}
