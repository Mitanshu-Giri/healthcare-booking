package com.healthcare.booking.service;

import com.healthcare.booking.dto.AuthResponse;
import com.healthcare.booking.dto.LoginRequest;
import com.healthcare.booking.dto.RegisterRequest;
import com.healthcare.booking.dto.UserDto;
import com.healthcare.booking.entity.PatientProfile;
import com.healthcare.booking.entity.Role;
import com.healthcare.booking.entity.User;
import com.healthcare.booking.exception.ApiException;
import com.healthcare.booking.repository.PatientProfileRepository;
import com.healthcare.booking.repository.UserRepository;
import com.healthcare.booking.security.JwtService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.Locale;

@Service
public class AuthService {

    private static final String BAD_CREDENTIALS = "Invalid email or password";

    private final UserRepository userRepository;
    private final PatientProfileRepository patientProfileRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final int maxFailedAttempts;
    private final Duration lockDuration;

    public AuthService(UserRepository userRepository,
                       PatientProfileRepository patientProfileRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       @Value("${app.security.max-failed-attempts}") int maxFailedAttempts,
                       @Value("${app.security.lock-minutes}") long lockMinutes) {
        this.userRepository = userRepository;
        this.patientProfileRepository = patientProfileRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.maxFailedAttempts = maxFailedAttempts;
        this.lockDuration = Duration.ofMinutes(lockMinutes);
    }

    /** Public registration always creates a PATIENT. The role is never taken from the request. */
    @Transactional
    public UserDto registerPatient(RegisterRequest request) {
        String email = normalize(request.email());

        if (userRepository.existsByEmail(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "An account with this email already exists");
        }

        String phone = (request.phone() == null || request.phone().isBlank()) ? null : request.phone().trim();
        User user = new User(email,
                passwordEncoder.encode(request.password()),
                request.fullName().trim(),
                phone,
                Role.PATIENT);
        userRepository.save(user);
        patientProfileRepository.save(new PatientProfile(user));

        return UserDto.from(user);
    }

    /**
     * noRollbackFor is important: when the password is wrong we throw an exception, but the
     * failed-attempt counter must still be saved. Without it the counter would roll back
     * and the brute-force lock would never trigger.
     */
    @Transactional(noRollbackFor = ApiException.class)
    public AuthResponse login(LoginRequest request) {
        String email = normalize(request.email());

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, BAD_CREDENTIALS));

        if (!user.isEnabled()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "This account has been deactivated");
        }

        if (user.isLocked()) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS,
                    "Account temporarily locked after too many failed attempts. Try again later.");
        }

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            int attempts = user.getFailedLoginAttempts() + 1;
            if (attempts >= maxFailedAttempts) {
                user.setLockedUntil(Instant.now().plus(lockDuration));
                user.setFailedLoginAttempts(0);
            } else {
                user.setFailedLoginAttempts(attempts);
            }
            userRepository.save(user);
            throw new ApiException(HttpStatus.UNAUTHORIZED, BAD_CREDENTIALS);
        }

        // successful login: clear the counters
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        userRepository.save(user);

        String token = jwtService.generateToken(user);
        return AuthResponse.bearer(token, jwtService.getExpirySeconds(), UserDto.from(user));
    }

    @Transactional(readOnly = true)
    public UserDto getCurrentUser(Long userId) {
        return userRepository.findById(userId)
                .map(UserDto::from)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private String normalize(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
