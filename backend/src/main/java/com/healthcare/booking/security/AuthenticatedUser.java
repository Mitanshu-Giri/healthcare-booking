package com.healthcare.booking.security;

import com.healthcare.booking.entity.Role;

/** The logged-in user as seen by controllers (via @AuthenticationPrincipal). */
public record AuthenticatedUser(Long id, String email, Role role) {
}
