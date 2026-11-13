package com.healthcare.booking.exception;

import org.springframework.http.HttpStatus;

/** A business-rule error that should be returned to the client with a specific HTTP status. */
public class ApiException extends RuntimeException {

    private final HttpStatus status;

    public ApiException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
