package com.pulsedesk.savedview.api.controller;

import com.pulsedesk.savedview.api.dto.SavedViewCreateRequest;
import com.pulsedesk.savedview.api.dto.SavedViewResponse;
import com.pulsedesk.savedview.service.SavedViewService;
import com.pulsedesk.security.AuthPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/saved-views")
@RequiredArgsConstructor
public class SavedViewController {

    private final SavedViewService savedViewService;

    @GetMapping
    public List<SavedViewResponse> listSavedViews(
            @AuthenticationPrincipal AuthPrincipal currentUser
    ) {
        return savedViewService.listSavedViews(currentUser);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SavedViewResponse createSavedView(
            @Valid @RequestBody SavedViewCreateRequest request,
            @AuthenticationPrincipal AuthPrincipal currentUser
    ) {
        return savedViewService.createSavedView(currentUser, request);
    }

    @DeleteMapping("/{savedViewId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteSavedView(
            @PathVariable Long savedViewId,
            @AuthenticationPrincipal AuthPrincipal currentUser
    ) {
        savedViewService.deleteSavedView(currentUser, savedViewId);
    }
}