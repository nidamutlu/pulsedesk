package com.pulsedesk.common.api;

/**
 * Standard error response returned by the API.
 * Details can be a map / list / string depending on the error type.
 */
public record ApiError(
        String code,
        String message,
        Object details
) {
    public static ApiError of(String code, String message) {
        return new ApiError(code, message, null);
    }

    public static ApiError of(String code, String message, Object details) {
        return new ApiError(code, message, details);
    }
}