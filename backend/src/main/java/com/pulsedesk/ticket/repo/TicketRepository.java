package com.pulsedesk.ticket.repo;

import com.pulsedesk.ticket.domain.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;

/** Repository interface providing basic CRUD operations for Ticket entities. */
public interface TicketRepository extends JpaRepository<Ticket, Long> {
}
