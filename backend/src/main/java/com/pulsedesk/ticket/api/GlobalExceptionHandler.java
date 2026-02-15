package com.pulsedesk.ticket.api;

import com.pulsedesk.ticket.exception.TicketNotFoundException;
import com.pulsedesk.ticket.exception.TicketTransitionInvalidException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Global REST exception handler.
 * Converts domain and validation errors into ApiError responses.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * Thrown when a ticket cannot be found.
     */
    @ExceptionHandler(TicketNotFoundException.class)
    public ResponseEntity<ApiError> handleTicketNotFound(TicketNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ApiError(
                        "TICKET_NOT_FOUND",
                        ex.getMessage(),
                        Map.of("ticketId", ex.getTicketId())
                ));
    }

    /**
     * Thrown when an invalid status transition is requested.
     */
    @ExceptionHandler(TicketTransitionInvalidException.class)
    public ResponseEntity<ApiError> handleTransitionInvalid(TicketTransitionInvalidException ex) {
        // HashMap is used to safely handle potential null values
        Map<String, Object> details = new HashMap<>();
        details.put("ticketId", ex.getTicketId());
        details.put("transition", ex.getTransition());

        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ApiError(
                        "TICKET_TRANSITION_INVALID",
                        ex.getMessage(),
                        details
                ));
    }

    /**
     * Handles bean validation errors.
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex) {
        var details = ex.getBindingResult().getFieldErrors().stream()
                .collect(Collectors.toMap(
                        fe -> fe.getField(),
                        fe -> fe.getDefaultMessage(),
                        (a, b) -> a
                ));

        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ApiError("VALIDATION_ERROR", "Validation failed", details));
    }

    /**
     * Handles invalid arguments passed to service methods.
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiError> handleIllegalArgument(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ApiError("BAD_REQUEST", ex.getMessage(), null));
    }

    /**
     * Handles malformed JSON request bodies.
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiError> handleUnreadableBody(HttpMessageNotReadableException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ApiError("BAD_REQUEST", "Malformed JSON request body", null));
    }
}
