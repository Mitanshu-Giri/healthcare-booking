package com.healthcare.booking.repository;

import com.healthcare.booking.entity.Appointment;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface AppointmentRepository extends JpaRepository<Appointment, Long> {

    /** True if the slot has ever had an appointment (any status). Used to protect appointment history. */
    boolean existsBySlotId(Long slotId);

    // ---- ownership checks. They return the slot id ONLY if the appointment belongs to the caller,
    // ---- and they read just a number, so no appointment entity is cached before we take the locks.

    @Query("select a.slot.id from Appointment a where a.id = :appointmentId and a.patient.user.id = :userId")
    Optional<Long> findSlotIdForPatient(@Param("appointmentId") Long appointmentId,
                                        @Param("userId") Long userId);

    @Query("select a.slot.id from Appointment a where a.id = :appointmentId and a.slot.doctor.user.id = :userId")
    Optional<Long> findSlotIdForDoctor(@Param("appointmentId") Long appointmentId,
                                       @Param("userId") Long userId);

    /** SELECT ... FOR UPDATE on the appointment row. Always called AFTER the slot row is locked. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from Appointment a where a.id = :appointmentId")
    Optional<Appointment> findByIdForUpdate(@Param("appointmentId") Long appointmentId);

    // ---- lists. Everything the DTOs need is fetched in the same query (open-in-view is off).

    @Query("""
            select a from Appointment a
            join fetch a.slot s
            join fetch s.doctor d
            join fetch d.user
            where a.patient.user.id = :userId
            order by s.slotDate desc, s.startTime desc
            """)
    List<Appointment> findForPatient(@Param("userId") Long userId);

    @Query("""
            select a from Appointment a
            join fetch a.slot s
            join fetch a.patient p
            join fetch p.user
            where s.doctor.user.id = :userId
            order by s.slotDate asc, s.startTime asc
            """)
    List<Appointment> findForDoctor(@Param("userId") Long userId);
}
