package com.healthcare.booking.dto;

import com.healthcare.booking.entity.Role;
import com.healthcare.booking.entity.User;

/** Safe view of a user. Never contains the password hash. */
public record UserDto(Long id, String fullName, String email, Role role) {

    public static UserDto from(User user) {
        return new UserDto(user.getId(), user.getFullName(), user.getEmail(), user.getRole());
    }
}
