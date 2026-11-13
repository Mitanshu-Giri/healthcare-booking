package com.healthcare.booking.repository;

import com.healthcare.booking.entity.AvailabilitySlot;
import com.healthcare.booking.entity.SlotStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

// Parameter names avoid HQL keywords (from, end, date) on purpose.
public interface AvailabilitySlotRepository extends JpaRepository<AvailabilitySlot, Long> {

    /**
     * Two time ranges overlap when each one starts before the other ends.
     * Back-to-back slots (10:00-10:30 then 10:30-11:00) do NOT overlap.
     */
    @Query("""
            select count(s) from AvailabilitySlot s
            where s.doctor.id = :doctorId
              and s.slotDate = :slotDay
              and s.startTime < :newEnd
              and s.endTime > :newStart
              and s.id <> :excludeId
            """)
    long countOverlapping(@Param("doctorId") Long doctorId,
                          @Param("slotDay") LocalDate slotDay,
                          @Param("newStart") LocalTime newStart,
                          @Param("newEnd") LocalTime newEnd,
                          @Param("excludeId") Long excludeId);

    /** All slots (any status) of one doctor in a date range, for the doctor's own view. */
    @Query("""
            select s from AvailabilitySlot s
            where s.doctor.id = :doctorId
              and s.slotDate between :firstDay and :lastDay
            order by s.slotDate, s.startTime
            """)
    List<AvailabilitySlot> findForDoctor(@Param("doctorId") Long doctorId,
                                         @Param("firstDay") LocalDate firstDay,
                                         @Param("lastDay") LocalDate lastDay);

    /** Slots of one doctor with a given status in a date range, for the patient-facing view. */
    @Query("""
            select s from AvailabilitySlot s
            where s.doctor.id = :doctorId
              and s.status = :status
              and s.slotDate between :firstDay and :lastDay
            order by s.slotDate, s.startTime
            """)
    List<AvailabilitySlot> findForDoctorByStatus(@Param("doctorId") Long doctorId,
                                                 @Param("status") SlotStatus status,
                                                 @Param("firstDay") LocalDate firstDay,
                                                 @Param("lastDay") LocalDate lastDay);

    /**
     * Loads a slot only if it belongs to the given doctor, and locks the row until the
     * transaction ends (SELECT ... FOR UPDATE). The booking code will lock the same row,
     * so a doctor cannot edit/delete a slot at the exact moment a patient books it.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select s from AvailabilitySlot s
            where s.id = :slotId and s.doctor.id = :doctorId
            """)
    Optional<AvailabilitySlot> findOwnedForUpdate(@Param("slotId") Long slotId,
                                                  @Param("doctorId") Long doctorId);
}
