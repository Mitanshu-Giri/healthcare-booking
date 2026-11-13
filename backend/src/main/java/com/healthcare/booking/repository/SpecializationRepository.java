package com.healthcare.booking.repository;

import com.healthcare.booking.entity.Specialization;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SpecializationRepository extends JpaRepository<Specialization, Long> {

    List<Specialization> findAllByOrderByNameAsc();

    Optional<Specialization> findByName(String name);
}
