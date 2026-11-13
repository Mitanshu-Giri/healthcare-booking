package com.healthcare.booking.repository;

import com.healthcare.booking.entity.ApprovalStatus;
import com.healthcare.booking.entity.DoctorProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

/**
 * "Active" doctor = approval_status APPROVED and the linked user account is enabled.
 * The user and the specializations are fetched in the same query so nothing is lazily
 * loaded later (open-in-view is off).
 */
public interface DoctorProfileRepository extends JpaRepository<DoctorProfile, Long> {

    @Query("""
            select d from DoctorProfile d
            join fetch d.user u
            left join fetch d.specializations
            where d.approvalStatus = :status
              and u.enabled = true
              and lower(u.fullName) like concat('%', :search, '%')
            order by u.fullName
            """)
    List<DoctorProfile> findActive(@Param("status") ApprovalStatus status,
                                   @Param("search") String search);

    // exists(...) filters doctors without shrinking the fetched specialization list of each doctor
    @Query("""
            select d from DoctorProfile d
            join fetch d.user u
            left join fetch d.specializations
            where d.approvalStatus = :status
              and u.enabled = true
              and lower(u.fullName) like concat('%', :search, '%')
              and exists (select 1 from d.specializations f where f.id = :specializationId)
            order by u.fullName
            """)
    List<DoctorProfile> findActiveBySpecialization(@Param("status") ApprovalStatus status,
                                                   @Param("search") String search,
                                                   @Param("specializationId") Long specializationId);

    @Query("""
            select d from DoctorProfile d
            join fetch d.user u
            left join fetch d.specializations
            where d.id = :id
              and d.approvalStatus = :status
              and u.enabled = true
            """)
    Optional<DoctorProfile> findActiveById(@Param("id") Long id,
                                           @Param("status") ApprovalStatus status);
}
