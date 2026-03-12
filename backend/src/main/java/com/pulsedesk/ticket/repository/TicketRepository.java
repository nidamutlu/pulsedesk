package com.pulsedesk.ticket.repository;

import com.pulsedesk.ticket.domain.Ticket;
import com.pulsedesk.ticket.domain.TicketPriority;
import com.pulsedesk.ticket.domain.TicketStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TicketRepository
        extends JpaRepository<Ticket, Long>,
        JpaSpecificationExecutor<Ticket> {

    long countByStatus(TicketStatus status);

    long countByPriority(TicketPriority priority);

    @Query(value = """
        select avg(extract(epoch from (resolved_at - created_at)) / 3600.0)
        from tickets
        where resolved_at is not null
    """, nativeQuery = true)
    Double calculateAverageResolutionHours();

    @Query(value = """
        select date(created_at) as day, count(*) as total
        from tickets
        where date(created_at) >= current_date - 6
        group by date(created_at)
        order by day
    """, nativeQuery = true)
    List<Object[]> countCreatedTicketsLast7DaysRaw();
}