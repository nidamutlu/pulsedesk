package com.pulsedesk.savedview;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pulsedesk.common.api.GlobalExceptionHandler;
import com.pulsedesk.savedview.api.controller.SavedViewController;
import com.pulsedesk.savedview.api.dto.SavedViewCreateRequest;
import com.pulsedesk.savedview.api.dto.SavedViewResponse;
import com.pulsedesk.savedview.service.SavedViewService;
import com.pulsedesk.security.JwtAuthFilter;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.boot.autoconfigure.security.servlet.SecurityFilterAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.OffsetDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(
        controllers = SavedViewController.class,
        excludeAutoConfiguration = {
                SecurityAutoConfiguration.class,
                SecurityFilterAutoConfiguration.class
        },
        excludeFilters = {
                @ComponentScan.Filter(
                        type = FilterType.ASSIGNABLE_TYPE,
                        classes = JwtAuthFilter.class
                )
        }
)
@AutoConfigureMockMvc(addFilters = false)
@Import(GlobalExceptionHandler.class)
class SavedViewControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private SavedViewService savedViewService;

    @Test
    void createSavedView_shouldReturnCreatedResponse() throws Exception {
        SavedViewCreateRequest request = new SavedViewCreateRequest(
                "Open High Priority",
                "{\"status\":\"OPEN\",\"priority\":\"HIGH\",\"sort\":\"createdAt,desc\"}"
        );

        SavedViewResponse response = new SavedViewResponse(
                1L,
                "Open High Priority",
                "{\"status\":\"OPEN\",\"priority\":\"HIGH\",\"sort\":\"createdAt,desc\"}",
                OffsetDateTime.parse("2026-03-15T20:54:11Z")
        );

        when(savedViewService.createSavedView(any(), any())).thenReturn(response);

        mockMvc.perform(
                        post("/saved-views")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request))
                )
                .andExpect(status().isCreated())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.name").value("Open High Priority"))
                .andExpect(jsonPath("$.filterJson")
                        .value("{\"status\":\"OPEN\",\"priority\":\"HIGH\",\"sort\":\"createdAt,desc\"}"))
                .andExpect(jsonPath("$.createdAt").value("2026-03-15T20:54:11Z"));
    }

    @Test
    void createSavedView_shouldRejectUnsupportedFilterField() throws Exception {
        SavedViewCreateRequest request = new SavedViewCreateRequest(
                "Broken View",
                "{\"status\":\"OPEN\",\"unknownField\":\"x\"}"
        );

        doThrow(new IllegalArgumentException("Unsupported filter field: unknownField"))
                .when(savedViewService)
                .createSavedView(any(), any());

        mockMvc.perform(
                        post("/saved-views")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request))
                )
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"))
                .andExpect(jsonPath("$.message").value("Unsupported filter field: unknownField"));
    }

    @Test
    void listSavedViews_shouldReturnSavedViews() throws Exception {
        List<SavedViewResponse> response = List.of(
                new SavedViewResponse(
                        1L,
                        "Open High Priority",
                        "{\"status\":\"OPEN\",\"priority\":\"HIGH\"}",
                        OffsetDateTime.parse("2026-03-15T20:54:11Z")
                )
        );

        when(savedViewService.listSavedViews(any())).thenReturn(response);

        mockMvc.perform(get("/saved-views"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].name").value("Open High Priority"))
                .andExpect(jsonPath("$[0].filterJson")
                        .value("{\"status\":\"OPEN\",\"priority\":\"HIGH\"}"))
                .andExpect(jsonPath("$[0].createdAt").value("2026-03-15T20:54:11Z"));
    }

    @Test
    void deleteSavedView_shouldReturnNoContent() throws Exception {
        doNothing().when(savedViewService).deleteSavedView(any(), any());

        mockMvc.perform(delete("/saved-views/1"))
                .andExpect(status().isNoContent());
    }
}