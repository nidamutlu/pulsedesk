package com.pulsedesk.ticket.service;

import com.pulsedesk.security.AuthPrincipal;
import com.pulsedesk.ticket.api.dto.BulkAssignRequest;
import com.pulsedesk.ticket.api.dto.BulkOperationResponse;
import com.pulsedesk.ticket.api.dto.BulkTransitionRequest;
import com.pulsedesk.ticket.domain.TicketStatus;
import com.pulsedesk.user.domain.UserRole;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
class TicketServiceBulkTest {

    @Autowired
    private TicketService ticketService;

    private final AuthPrincipal admin =
            new AuthPrincipal(1L, "admin", UserRole.ADMIN, null);

    @Test
    void bulkAssign_shouldReturnCorrectCounts() {
        BulkAssignRequest request =
                new BulkAssignRequest(List.of(1L, 2L), 2L);

        BulkOperationResponse response =
                ticketService.bulkAssign(admin, request);

        assertEquals(2, response.totalCount());
        assertEquals(2, response.successCount());
        assertEquals(0, response.failureCount());
        assertNotNull(response.message());
        assertEquals(2, response.results().size());
    }

    @Test
    void bulkTransition_shouldReportInvalidTransitions() {
        BulkTransitionRequest request =
                new BulkTransitionRequest(List.of(4L, 5L), TicketStatus.CLOSED);

        BulkOperationResponse response =
                ticketService.bulkTransition(admin, request);

        assertEquals(2, response.totalCount());
        assertEquals(0, response.successCount());
        assertEquals(2, response.failureCount());
        assertNotNull(response.message());
        assertEquals(2, response.results().size());
        assertTrue(
                response.results().stream().allMatch(result -> !result.success())
        );
    }
}