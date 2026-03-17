package com.pulsedesk.savedview.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pulsedesk.savedview.api.dto.SavedViewCreateRequest;
import com.pulsedesk.savedview.api.dto.SavedViewResponse;
import com.pulsedesk.savedview.domain.SavedView;
import com.pulsedesk.savedview.repository.SavedViewRepository;
import com.pulsedesk.security.AuthPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SavedViewServiceTest {

    @Mock
    private SavedViewRepository savedViewRepository;

    @Mock
    private AuthPrincipal currentUser;

    private SavedViewService savedViewService;

    @BeforeEach
    void setUp() {
        savedViewService = new SavedViewService(
                savedViewRepository,
                new ObjectMapper()
        );
    }

    @Test
    void createSavedView_shouldPersistAndReturnResponse() {
        SavedViewCreateRequest request = new SavedViewCreateRequest(
                "Open High Priority",
                "{\"status\":\"OPEN\",\"priority\":\"HIGH\",\"sort\":\"createdAt,desc\"}"
        );

        when(currentUser.userId()).thenReturn(1L);

        when(savedViewRepository.save(any(SavedView.class))).thenAnswer(invocation -> {
            SavedView saved = invocation.getArgument(0);
            ReflectionTestUtils.setField(saved, "id", 1L);
            return saved;
        });

        SavedViewResponse response = savedViewService.createSavedView(currentUser, request);

        assertThat(response).isNotNull();
        assertThat(response.id()).isEqualTo(1L);
        assertThat(response.name()).isEqualTo("Open High Priority");
        assertThat(response.filterJson())
                .isEqualTo("{\"status\":\"OPEN\",\"priority\":\"HIGH\",\"sort\":\"createdAt,desc\"}");
        assertThat(response.createdAt()).isNotNull();

        verify(savedViewRepository).save(any(SavedView.class));
    }

    @Test
    void createSavedView_shouldRejectUnsupportedFilterField() {
        SavedViewCreateRequest request = new SavedViewCreateRequest(
                "Broken View",
                "{\"status\":\"OPEN\",\"unknownField\":\"x\"}"
        );

        when(currentUser.userId()).thenReturn(1L);

        assertThatThrownBy(() -> savedViewService.createSavedView(currentUser, request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Unsupported filter field: unknownField");

        verify(savedViewRepository, never()).save(any(SavedView.class));
    }

    @Test
    void createSavedView_shouldRejectInvalidJson() {
        SavedViewCreateRequest request = new SavedViewCreateRequest(
                "Broken Json View",
                "{status:OPEN"
        );

        when(currentUser.userId()).thenReturn(1L);

        assertThatThrownBy(() -> savedViewService.createSavedView(currentUser, request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("filterJson must be valid JSON");

        verify(savedViewRepository, never()).save(any(SavedView.class));
    }

    @Test
    void listSavedViews_shouldReturnCurrentUsersViews() {
        OffsetDateTime now = OffsetDateTime.parse("2026-03-15T23:00:00Z");

        SavedView first = new SavedView(
                1L,
                "Open High Priority",
                "{\"status\":\"OPEN\",\"priority\":\"HIGH\"}",
                now
        );
        ReflectionTestUtils.setField(first, "id", 1L);

        SavedView second = new SavedView(
                1L,
                "Waiting Customer",
                "{\"status\":\"WAITING_CUSTOMER\"}",
                now.minusMinutes(5)
        );
        ReflectionTestUtils.setField(second, "id", 2L);

        when(currentUser.userId()).thenReturn(1L);
        when(savedViewRepository.findAllByOwnerIdOrderByCreatedAtDesc(1L))
                .thenReturn(List.of(first, second));

        List<SavedViewResponse> result = savedViewService.listSavedViews(currentUser);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).id()).isEqualTo(1L);
        assertThat(result.get(0).name()).isEqualTo("Open High Priority");
        assertThat(result.get(1).id()).isEqualTo(2L);
        assertThat(result.get(1).name()).isEqualTo("Waiting Customer");
    }

    @Test
    void deleteSavedView_shouldDeleteOwnedSavedView() {
        SavedView savedView = new SavedView(
                1L,
                "Open High Priority",
                "{\"status\":\"OPEN\"}",
                OffsetDateTime.parse("2026-03-15T23:00:00Z")
        );
        ReflectionTestUtils.setField(savedView, "id", 1L);

        when(currentUser.userId()).thenReturn(1L);
        when(savedViewRepository.findByIdAndOwnerId(1L, 1L))
                .thenReturn(Optional.of(savedView));

        savedViewService.deleteSavedView(currentUser, 1L);

        verify(savedViewRepository).delete(savedView);
    }

    @Test
    void deleteSavedView_shouldRejectWhenUserIsUnauthenticated() {
        when(currentUser.userId()).thenReturn(null);

        assertThatThrownBy(() -> savedViewService.deleteSavedView(currentUser, 1L))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Unauthenticated");

        verify(savedViewRepository, never()).findByIdAndOwnerId(any(Long.class), any(Long.class));
    }
}