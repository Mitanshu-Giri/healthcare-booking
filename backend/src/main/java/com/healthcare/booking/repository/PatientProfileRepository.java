package com.healthcare.booking.repository;

import com.healthcare.booking.entity.PatientProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PatientProfileRepository extends JpaRepository<PatientProfile, Long> {

    /** The patient profile that belongs to a login account (users.id). */
    Optional<PatientProfile> findByUserId(Long userId);
}
