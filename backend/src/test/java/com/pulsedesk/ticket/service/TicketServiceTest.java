package com.pulsedesk.ticket.service;

import com.pulsedesk.notification.repository.NotificationRepository;
import com.pulsedesk.security.AuthPrincipal;
import com.pulsedesk.ticket.api.dto.TicketRequest;
import com.pulsedesk.ticket.api.dto.TicketResponse;
import com.pulsedesk.ticket.domain.Ticket;
import com.pulsedesk.ticket.domain.TicketPriority;
import com.pulsedesk.ticket.domain.TicketStatus;
import com.pulsedesk.ticket.repository.CommentRepository;
import com.pulsedesk.ticket.repository.TicketAuditLogRepository;
import com.pulsedesk.ticket.repository.TicketRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TicketServiceTest {

    @Mock
    private TicketRepository ticketRepository;

    @Mock
    private TicketAuditLogRepository auditLogRepository;

    @Mock
    private CommentRepository commentRepository;

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private AuthPrincipal currentUser;

    private TicketService ticketService;

    @BeforeEach
    void setUp() {
        ticketService = new TicketService(
                ticketRepository,
                auditLogRepository,
                commentRepository,
                notificationRepository
        );
    }

    @Test
    void exportTicketsCsv_shouldReturnExpectedHeaderAndRow() {
        OffsetDateTime createdAt = OffsetDateTime.parse("2026-03-15T10:00:00+03:00");
        OffsetDateTime updatedAt = OffsetDateTime.parse("2026-03-15T12:30:00+03:00");

        Ticket ticket = new Ticket(
                "Dashboard summary cards not loading",
                "Dashboard summary endpoint returns incomplete data for admin view",
                TicketPriority.HIGH,
                10L,
                1L
        );
        ticket.initializeTimestamps(createdAt);
        ticket.assignTo(20L);
        ticket.updateDetails(
                ticket.getTitle(),
                ticket.getDescription(),
                ticket.getPriority(),
                updatedAt
        );

        when(currentUser.userId()).thenReturn(1L);
        when(currentUser.isAdmin()).thenReturn(true);

        when(ticketRepository.findAll(
                org.mockito.ArgumentMatchers.<Specification<Ticket>>any(),
                any(Sort.class)
        )).thenReturn(List.of(ticket));

        String csv = ticketService.exportTicketsCsv(
                currentUser,
                TicketStatus.OPEN,
                TicketPriority.HIGH,
                null,
                null,
                "dashboard",
                null,
                null,
                PageRequest.of(0, 20, Sort.by(Sort.Direction.ASC, "id"))
        );

        assertThat(csv).contains("id,title,status,priority,requester,assignee,createdAt,updatedAt");
        assertThat(csv).contains("\"Dashboard summary cards not loading\"");
        assertThat(csv).contains("\"OPEN\"");
        assertThat(csv).contains("\"HIGH\"");
        assertThat(csv).contains("\"10\"");
        assertThat(csv).contains("\"20\"");
        assertThat(csv).contains("\"2026-03-15T10:00:00+03:00\"");
        assertThat(csv).contains("\"2026-03-15T12:30:00+03:00\"");
    }

    @Test
    void createTicket_shouldPersistTicket() {
        OffsetDateTime now = OffsetDateTime.parse("2026-03-15T09:00:00+03:00");

        TicketRequest request = new TicketRequest();
        request.setTitle("New dashboard support request");
        request.setDescription("Requester cannot view dashboard widgets");
        request.setPriority(TicketPriority.MEDIUM);
        request.setTeamId(1L);

        Ticket savedTicket = new Ticket(
                request.getTitle(),
                request.getDescription(),
                request.getPriority(),
                10L,
                1L
        );
        savedTicket.initializeTimestamps(now);

        when(currentUser.userId()).thenReturn(10L);
        when(currentUser.isAgent()).thenReturn(false);
        when(ticketRepository.save(any(Ticket.class))).thenReturn(savedTicket);

        TicketResponse response = ticketService.createTicket(currentUser, request);

        assertThat(response).isNotNull();
        assertThat(response.getTitle()).isEqualTo("New dashboard support request");
        assertThat(response.getPriority()).isEqualTo(TicketPriority.MEDIUM);
    }

    @Test
    void listTickets_shouldReturnPagedResult() {
        OffsetDateTime now = OffsetDateTime.parse("2026-03-15T11:00:00+03:00");

        Ticket ticket = new Ticket(
                "Dashboard filter issue",
                "Admin dashboard filters do not refresh correctly",
                TicketPriority.HIGH,
                1L,
                1L
        );
        ticket.initializeTimestamps(now);

        Pageable pageable = PageRequest.of(0, 10);
        Page<Ticket> ticketPage = new PageImpl<>(List.of(ticket), pageable, 1);

        when(currentUser.userId()).thenReturn(1L);
        when(currentUser.isAdmin()).thenReturn(true);

        when(ticketRepository.findAll(
                org.mockito.ArgumentMatchers.<Specification<Ticket>>any(),
                any(Pageable.class)
        )).thenReturn(ticketPage);

        Page<TicketResponse> result = ticketService.listTickets(
                currentUser,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                pageable
        );

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getTitle()).isEqualTo("Dashboard filter issue");
    }

    @Test
    void transitionTicket_shouldChangeStatus() {
        OffsetDateTime now = OffsetDateTime.parse("2026-03-15T13:00:00+03:00");

        Ticket ticket = new Ticket(
                "Dashboard export button inactive",
                "Export CSV button stays disabled after filters change",
                TicketPriority.HIGH,
                1L,
                1L
        );
        ticket.initializeTimestamps(now);

        when(currentUser.userId()).thenReturn(1L);
        when(currentUser.isAdmin()).thenReturn(true);

        when(ticketRepository.findById(1L)).thenReturn(Optional.of(ticket));
        when(ticketRepository.save(any(Ticket.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(auditLogRepository.save(any()))
                .thenAnswer(invocation -> invocation.getArgument(0));

        TicketResponse response = ticketService.transitionTicket(
                currentUser,
                1L,
                TicketStatus.IN_PROGRESS
        );

        assertThat(response).isNotNull();
        assertThat(response.getStatus()).isEqualTo(TicketStatus.IN_PROGRESS);
    }
}