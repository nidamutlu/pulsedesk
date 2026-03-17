package com.pulsedesk.savedview.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pulsedesk.savedview.api.dto.SavedViewCreateRequest;
import com.pulsedesk.savedview.api.dto.SavedViewResponse;
import com.pulsedesk.savedview.domain.SavedView;
import com.pulsedesk.savedview.repository.SavedViewRepository;
import com.pulsedesk.security.AuthPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@Transactional
@RequiredArgsConstructor
public class SavedViewService {

    private static final Set<String> ALLOWED_FILTER_KEYS = Set.of(
            "status",
            "priority",
            "assigneeId",
            "teamId",
            "query",
            "createdFrom",
            "createdTo",
            "sort"
    );

    private final SavedViewRepository savedViewRepository;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public List<SavedViewResponse> listSavedViews(AuthPrincipal currentUser) {
        requireAuthenticated(currentUser);

        return savedViewRepository.findAllByOwnerIdOrderByCreatedAtDesc(currentUser.userId())
                .stream()
                .map(SavedViewResponse::from)
                .toList();
    }

    public SavedViewResponse createSavedView(
            AuthPrincipal currentUser,
            SavedViewCreateRequest request
    ) {
        requireAuthenticated(currentUser);
        requireValidRequest(request);
        validateFilterJson(request.filterJson());

        SavedView savedView = new SavedView(
                currentUser.userId(),
                request.name().trim(),
                request.filterJson().trim(),
                OffsetDateTime.now()
        );

        SavedView saved = savedViewRepository.save(savedView);
        return SavedViewResponse.from(saved);
    }

    public void deleteSavedView(AuthPrincipal currentUser, Long savedViewId) {
        requireAuthenticated(currentUser);

        SavedView savedView = savedViewRepository.findByIdAndOwnerId(savedViewId, currentUser.userId())
                .orElseThrow(() -> new AccessDeniedException("Saved view not found or not accessible"));

        savedViewRepository.delete(savedView);
    }

    private void validateFilterJson(String filterJson) {
        try {
            Map<String, Object> filters = objectMapper.readValue(
                    filterJson,
                    new TypeReference<Map<String, Object>>() {}
            );

            for (String key : filters.keySet()) {
                if (!ALLOWED_FILTER_KEYS.contains(key)) {
                    throw new IllegalArgumentException("Unsupported filter field: " + key);
                }
            }
        } catch (JsonProcessingException ex) {
            throw new IllegalArgumentException("filterJson must be valid JSON", ex);
        }
    }

    private static void requireAuthenticated(AuthPrincipal currentUser) {
        if (currentUser == null || currentUser.userId() == null) {
            throw new AccessDeniedException("Unauthenticated");
        }
    }

    private static void requireValidRequest(SavedViewCreateRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Request is required");
        }

        if (request.name() == null || request.name().isBlank()) {
            throw new IllegalArgumentException("name is required");
        }

        if (request.filterJson() == null || request.filterJson().isBlank()) {
            throw new IllegalArgumentException("filterJson is required");
        }
    }
}