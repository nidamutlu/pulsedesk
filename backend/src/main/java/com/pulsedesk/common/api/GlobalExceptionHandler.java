package com.pulsedesk.common.api;

import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.exc.InvalidFormatException;
import com.pulsedesk.ticket.exception.TicketNotFoundException;
import com.pulsedesk.ticket.exception.TicketTransitionInvalidException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    /** 404 - Ticket not found */
    @ExceptionHandler(TicketNotFoundException.class)
    public ResponseEntity<ApiError> handleTicketNotFound(TicketNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ApiError(
                        "TICKET_NOT_FOUND",
                        ex.getMessage(),
                        Map.of("ticketId", ex.getTicketId())
                ));
    }

    /** 409 - Invalid workflow transition */
    @ExceptionHandler(TicketTransitionInvalidException.class)
    public ResponseEntity<ApiError> handleTransitionInvalid(TicketTransitionInvalidException ex) {
        Map<String, Object> details = new LinkedHashMap<>();
        details.put("ticketId", ex.getTicketId());
        details.put("transition", ex.getTransition());

        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ApiError(
                        "TICKET_TRANSITION_INVALID",
                        ex.getMessage(),
                        details
                ));
    }

    /** 400 - Bean validation failed */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();

        for (FieldError fe : ex.getBindingResult().getFieldErrors()) {
            String message = (fe.getDefaultMessage() == null || fe.getDefaultMessage().isBlank())
                    ? "invalid value"
                    : fe.getDefaultMessage();

            fieldErrors.merge(fe.getField(), message, (a, b) -> a + "; " + b);
        }

        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ApiError(
                        "VALIDATION_ERROR",
                        "Validation failed",
                        fieldErrors
                ));
    }

    /** 400 - Invalid input */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiError> handleIllegalArgument(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ApiError(
                        "BAD_REQUEST",
                        ex.getMessage(),
                        null
                ));
    }

    /** 400 - Malformed JSON / wrong enum value */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiError> handleUnreadableBody(HttpMessageNotReadableException ex) {
        Throwable root = rootCause(ex);

        if (root instanceof InvalidFormatException ife
                && ife.getTargetType() != null
                && ife.getTargetType().isEnum()) {

            String field = lastFieldName(ife.getPath());

            Map<String, Object> details = new LinkedHashMap<>();
            details.put("field", field);
            details.put("rejectedValue", ife.getValue());
            details.put("allowedValues", enumValues(ife.getTargetType()));

            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ApiError(
                            "INVALID_ENUM_VALUE",
                            "Invalid value for '" + field + "'",
                            details
                    ));
        }

        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ApiError(
                        "BAD_REQUEST",
                        "Malformed JSON request body",
                        null
                ));
    }

    // -------- Helpers --------

    private static Throwable rootCause(Throwable t) {
        Throwable current = t;
        while (current.getCause() != null && current.getCause() != current) {
            current = current.getCause();
        }
        return current;
    }

    private static String lastFieldName(List<JsonMappingException.Reference> path) {
        if (path == null || path.isEmpty()) return "unknown";
        String name = path.get(path.size() - 1).getFieldName();
        return (name == null || name.isBlank()) ? "unknown" : name;
    }

    private static List<String> enumValues(Class<?> enumType) {
        Object[] constants = enumType.getEnumConstants();
        if (constants == null) return List.of();
        return Arrays.stream(constants).map(Object::toString).toList();
    }
}
