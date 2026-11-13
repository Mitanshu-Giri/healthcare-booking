package com.healthcare.booking.controller;

import com.healthcare.booking.dto.AuthResponse;
import com.healthcare.booking.dto.LoginRequest;
import com.healthcare.booking.dto.RegisterRequest;
import com.healthcare.booking.dto.UserDto;
import com.healthcare.booking.security.AuthenticatedUser;
import com.healthcare.booking.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<UserDto> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.registerPatient(request));
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    /** Returns the currently logged-in user. Handy for the frontend after a page refresh. */
    @GetMapping("/me")
    public UserDto me(@AuthenticationPrincipal AuthenticatedUser principal) {
        return authService.getCurrentUser(principal.id());
    }
}
