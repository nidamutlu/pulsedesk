package com.pulsedesk.common.api;

import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.exc.InvalidFormatException;
import com.pulsedesk.ticket.exception.TicketNotFoundException;
import com.pulsedesk.ticket.exception.TicketTransitionInvalidException;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;

import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(TicketNotFoundException.class)
    public ResponseEntity<ApiError> handleTicketNotFound(TicketNotFoundException ex) {
        return respond(
                HttpStatus.NOT_FOUND,
                ApiError.of(
                        "TICKET_NOT_FOUND",
                        ex.getMessage(),
                        Map.of("ticketId", ex.getTicketId())
                )
        );
    }

    @ExceptionHandler(TicketTransitionInvalidException.class)
    public ResponseEntity<ApiError> handleTicketTransitionInvalid(TicketTransitionInvalidException ex) {
        return respond(
                HttpStatus.CONFLICT,
                ApiError.of(
                        "TICKET_TRANSITION_INVALID",
                        ex.getMessage(),
                        Map.of(
                                "ticketId", ex.getTicketId(),
                                "transition", ex.getTransition()
                        )
                )
        );
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ApiError> handleAuthentication(AuthenticationException ex) {
        return respond(
                HttpStatus.UNAUTHORIZED,
                ApiError.of(
                        "AUTH_UNAUTHORIZED",
                        "Authentication is required to access this resource"
                )
        );
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiError> handleResponseStatus(ResponseStatusException ex) {
        HttpStatus status = HttpStatus.valueOf(ex.getStatusCode().value());
        String reason = ex.getReason() == null || ex.getReason().isBlank()
                ? status.getReasonPhrase()
                : ex.getReason();

        String code = switch (status) {
            case BAD_REQUEST -> "BAD_REQUEST";
            case UNAUTHORIZED -> "AUTH_UNAUTHORIZED";
            case FORBIDDEN -> "AUTH_FORBIDDEN";
            case NOT_FOUND -> "NOT_FOUND";
            case CONFLICT -> "CONFLICT";
            default -> status.name();
        };

        return respond(
                status,
                ApiError.of(code, reason)
        );
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiError> handleAccessDenied(AccessDeniedException ex) {
        return respond(
                HttpStatus.FORBIDDEN,
                ApiError.of(
                        "AUTH_FORBIDDEN",
                        "You do not have permission to perform this action"
                )
        );
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> details = new LinkedHashMap<>();

        for (FieldError fieldError : ex.getBindingResult().getFieldErrors()) {
            String message = (fieldError.getDefaultMessage() == null || fieldError.getDefaultMessage().isBlank())
                    ? "invalid value"
                    : fieldError.getDefaultMessage();

            details.merge(fieldError.getField(), message, (a, b) -> a + "; " + b);
        }

        return respond(
                HttpStatus.BAD_REQUEST,
                ApiError.of(
                        "VALIDATION_ERROR",
                        "Validation failed",
                        details
                )
        );
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiError> handleConstraintViolation(ConstraintViolationException ex) {
        Map<String, String> details = new LinkedHashMap<>();

        for (ConstraintViolation<?> violation : ex.getConstraintViolations()) {
            String path = violation.getPropertyPath() == null
                    ? "unknown"
                    : violation.getPropertyPath().toString();

            String message = (violation.getMessage() == null || violation.getMessage().isBlank())
                    ? "invalid value"
                    : violation.getMessage();

            details.merge(path, message, (a, b) -> a + "; " + b);
        }

        return respond(
                HttpStatus.BAD_REQUEST,
                ApiError.of(
                        "VALIDATION_ERROR",
                        "Validation failed",
                        details
                )
        );
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiError> handleIllegalArgument(IllegalArgumentException ex) {
        return respond(
                HttpStatus.BAD_REQUEST,
                ApiError.of(
                        "INVALID_REQUEST",
                        ex.getMessage()
                )
        );
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiError> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        Map<String, Object> details = new LinkedHashMap<>();
        details.put("parameter", ex.getName());
        details.put("rejectedValue", ex.getValue());

        if (ex.getRequiredType() != null) {
            details.put("requiredType", ex.getRequiredType().getSimpleName());
        }

        return respond(
                HttpStatus.BAD_REQUEST,
                ApiError.of(
                        "INVALID_REQUEST_PARAM",
                        "Invalid value for '" + ex.getName() + "'",
                        details
                )
        );
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ApiError> handleMissingRequestParameter(MissingServletRequestParameterException ex) {
        Map<String, Object> details = new LinkedHashMap<>();
        details.put("parameter", ex.getParameterName());
        details.put("requiredType", ex.getParameterType());

        return respond(
                HttpStatus.BAD_REQUEST,
                ApiError.of(
                        "MISSING_REQUEST_PARAM",
                        "Missing required parameter '" + ex.getParameterName() + "'",
                        details
                )
        );
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiError> handleUnreadableBody(HttpMessageNotReadableException ex) {
        Throwable rootCause = getRootCause(ex);

        if (rootCause instanceof InvalidFormatException invalidFormatException
                && isEnumTarget(invalidFormatException)) {

            String field = getLastFieldName(invalidFormatException.getPath());

            Map<String, Object> details = new LinkedHashMap<>();
            details.put("field", field);
            details.put("rejectedValue", invalidFormatException.getValue());
            details.put("allowedValues", getEnumValues(invalidFormatException.getTargetType()));

            return respond(
                    HttpStatus.BAD_REQUEST,
                    ApiError.of(
                            "INVALID_ENUM_VALUE",
                            "Invalid value for '" + field + "'",
                            details
                    )
            );
        }

        return respond(
                HttpStatus.BAD_REQUEST,
                ApiError.of(
                        "MALFORMED_JSON",
                        "Malformed JSON request body"
                )
        );
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleUnexpected(Exception ex) {
        log.error("Unhandled exception", ex);

        return respond(
                HttpStatus.INTERNAL_SERVER_ERROR,
                ApiError.of(
                        "INTERNAL_ERROR",
                        "Unexpected error"
                )
        );
    }

    private static ResponseEntity<ApiError> respond(HttpStatus status, ApiError body) {
        return ResponseEntity.status(status).body(body);
    }

    private static Throwable getRootCause(Throwable throwable) {
        Throwable current = throwable;
        while (current.getCause() != null && current.getCause() != current) {
            current = current.getCause();
        }
        return current;
    }

    private static boolean isEnumTarget(InvalidFormatException ex) {
        return ex.getTargetType() != null && ex.getTargetType().isEnum();
    }

    private static String getLastFieldName(List<JsonMappingException.Reference> path) {
        if (path == null || path.isEmpty()) {
            return "unknown";
        }

        JsonMappingException.Reference last = path.get(path.size() - 1);
        String fieldName = last.getFieldName();

        if (fieldName != null && !fieldName.isBlank()) {
            return fieldName;
        }

        int index = last.getIndex();
        return index >= 0 ? "[" + index + "]" : "unknown";
    }

    private static List<String> getEnumValues(Class<?> enumType) {
        Object[] constants = enumType.getEnumConstants();
        if (constants == null) {
            return List.of();
        }

        return Arrays.stream(constants)
                .map(Object::toString)
                .toList();
    }
}