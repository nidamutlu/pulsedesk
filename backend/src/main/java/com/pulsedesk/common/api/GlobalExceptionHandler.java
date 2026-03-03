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

    // -------- Domain errors --------

    /** 404 - Ticket not found */
    @ExceptionHandler(TicketNotFoundException.class)
    public ResponseEntity<ApiError> handleTicketNotFound(TicketNotFoundException ex) {
        return build(HttpStatus.NOT_FOUND, ApiError.of(
                "TICKET_NOT_FOUND",
                ex.getMessage(),
                Map.of("ticketId", ex.getTicketId())
        ));
    }

    /** 409 - Invalid workflow transition */
    @ExceptionHandler(TicketTransitionInvalidException.class)
    public ResponseEntity<ApiError> handleTransitionInvalid(TicketTransitionInvalidException ex) {
        return build(HttpStatus.CONFLICT, ApiError.of(
                "TICKET_TRANSITION_INVALID",
                ex.getMessage(),
                Map.of(
                        "ticketId", ex.getTicketId(),
                        "transition", ex.getTransition()
                )
        ));
    }

    // -------- Validation / request errors --------

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

        return build(HttpStatus.BAD_REQUEST, ApiError.of(
                "VALIDATION_ERROR",
                "Validation failed",
                fieldErrors
        ));
    }

    /** 400 - Invalid input */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiError> handleIllegalArgument(IllegalArgumentException ex) {
        return build(HttpStatus.BAD_REQUEST, ApiError.of(
                "INVALID_REQUEST",
                ex.getMessage()
        ));
    }

    /** 400 - Malformed JSON / wrong enum value */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiError> handleUnreadableBody(HttpMessageNotReadableException ex) {
        Throwable root = rootCause(ex);

        if (root instanceof InvalidFormatException ife && isEnumTarget(ife)) {
            String field = lastFieldName(ife.getPath());

            Map<String, Object> details = new LinkedHashMap<>();
            details.put("field", field);
            details.put("rejectedValue", ife.getValue());
            details.put("allowedValues", enumValues(ife.getTargetType()));

            return build(HttpStatus.BAD_REQUEST, ApiError.of(
                    "INVALID_ENUM_VALUE",
                    "Invalid value for '" + field + "'",
                    details
            ));
        }

        return build(HttpStatus.BAD_REQUEST, ApiError.of(
                "MALFORMED_JSON",
                "Malformed JSON request body"
        ));
    }

    // -------- Helpers --------

    private static ResponseEntity<ApiError> build(HttpStatus status, ApiError body) {
        return ResponseEntity.status(status).body(body);
    }

    private static boolean isEnumTarget(InvalidFormatException ife) {
        return ife.getTargetType() != null && ife.getTargetType().isEnum();
    }

    private static Throwable rootCause(Throwable t) {
        Throwable current = t;
        while (current.getCause() != null && current.getCause() != current) {
            current = current.getCause();
        }
        return current;
    }

    private static String lastFieldName(List<JsonMappingException.Reference> path) {
        if (path == null || path.isEmpty()) return "unknown";

        JsonMappingException.Reference last = path.get(path.size() - 1);
        String name = last.getFieldName();
        if (name != null && !name.isBlank()) return name;

        int index = last.getIndex();
        return (index >= 0) ? "[" + index + "]" : "unknown";
    }

    private static List<String> enumValues(Class<?> enumType) {
        Object[] constants = enumType.getEnumConstants();
        if (constants == null) return List.of();
        return Arrays.stream(constants).map(Object::toString).toList();
    }
}