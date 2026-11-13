package com.healthcare.booking.config;

import com.healthcare.booking.entity.ApprovalStatus;
import com.healthcare.booking.entity.DoctorProfile;
import com.healthcare.booking.entity.Role;
import com.healthcare.booking.entity.Specialization;
import com.healthcare.booking.entity.User;
import com.healthcare.booking.repository.DoctorProfileRepository;
import com.healthcare.booking.repository.SpecializationRepository;
import com.healthcare.booking.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Creates demo doctors (with working logins) on startup so the app has data to show.
 *
 * Why Java and not an SQL migration: doctor accounts need a BCrypt password hash, and we do
 * not want password hashes committed inside .sql files. Here the hash is generated at runtime
 * from DEMO_DOCTOR_PASSWORD.
 *
 * Safe to restart: a doctor is skipped if their email already exists.
 * Turn off in production with SEED_DEMO_DATA=false.
 */
@Component
public class DemoDataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoDataInitializer.class);

    private record DemoDoctor(String name, String email, String qualification, int experienceYears,
                              String fee, String clinicAddress, String bio,
                              ApprovalStatus status, List<String> specializations) {
    }

    private static final List<DemoDoctor> DOCTORS = List.of(
            new DemoDoctor("Dr. Priya Sharma", "priya.sharma@demo.healthcare.example",
                    "MBBS, MD (General Medicine)", 12, "600.00", "Sunrise Health Clinic, Bengaluru",
                    "Family physician focused on preventive care, fever, infections and chronic condition follow-ups.",
                    ApprovalStatus.APPROVED, List.of("General Physician")),
            new DemoDoctor("Dr. Rahul Mehta", "rahul.mehta@demo.healthcare.example",
                    "MBBS, MD, DM (Cardiology)", 15, "1200.00", "HeartCare Centre, Mumbai",
                    "Interventional cardiologist treating blood pressure, chest pain and heart rhythm problems.",
                    ApprovalStatus.APPROVED, List.of("Cardiologist")),
            new DemoDoctor("Dr. Ananya Iyer", "ananya.iyer@demo.healthcare.example",
                    "MBBS, MD (Dermatology)", 8, "800.00", "ClearSkin Clinic, Chennai",
                    "Treats acne, eczema, hair loss and common skin allergies.",
                    ApprovalStatus.APPROVED, List.of("Dermatologist")),
            new DemoDoctor("Dr. Vikram Singh", "vikram.singh@demo.healthcare.example",
                    "MBBS, MS (Orthopaedics)", 18, "1000.00", "BoneAndJoint Hospital, Delhi",
                    "Specialises in joint pain, sports injuries and fracture care.",
                    ApprovalStatus.APPROVED, List.of("Orthopedic")),
            new DemoDoctor("Dr. Sneha Kulkarni", "sneha.kulkarni@demo.healthcare.example",
                    "MBBS, DCH (Child Health)", 10, "700.00", "LittleSteps Child Clinic, Pune",
                    "Child health, vaccinations, growth monitoring and common childhood illnesses.",
                    ApprovalStatus.APPROVED, List.of("Pediatrician", "General Physician")),
            new DemoDoctor("Dr. Arjun Nair", "arjun.nair@demo.healthcare.example",
                    "MBBS, MD, DM (Neurology)", 14, "1500.00", "NeuroCare Institute, Kochi",
                    "Headache, epilepsy, stroke recovery and nerve-related conditions.",
                    ApprovalStatus.APPROVED, List.of("Neurologist")),
            // Hidden on purpose: lets you verify that deactivated doctors never appear in the API.
            new DemoDoctor("Dr. Inactive Example", "inactive.example@demo.healthcare.example",
                    "BDS", 5, "400.00", "Demo Dental Clinic",
                    "Demo record used to verify that deactivated doctors are hidden from patients.",
                    ApprovalStatus.DEACTIVATED, List.of("Dentist"))
    );

    private final UserRepository userRepository;
    private final DoctorProfileRepository doctorProfileRepository;
    private final SpecializationRepository specializationRepository;
    private final PasswordEncoder passwordEncoder;
    private final boolean enabled;
    private final String demoPassword;

    public DemoDataInitializer(UserRepository userRepository,
                               DoctorProfileRepository doctorProfileRepository,
                               SpecializationRepository specializationRepository,
                               PasswordEncoder passwordEncoder,
                               @Value("${SEED_DEMO_DATA:true}") boolean enabled,
                               @Value("${DEMO_DOCTOR_PASSWORD:Doctor@123}") String demoPassword) {
        this.userRepository = userRepository;
        this.doctorProfileRepository = doctorProfileRepository;
        this.specializationRepository = specializationRepository;
        this.passwordEncoder = passwordEncoder;
        this.enabled = enabled;
        this.demoPassword = demoPassword;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (!enabled) {
            return;
        }

        String passwordHash = null;
        int created = 0;

        for (DemoDoctor d : DOCTORS) {
            if (userRepository.existsByEmail(d.email())) {
                continue;
            }
            if (passwordHash == null) {
                passwordHash = passwordEncoder.encode(demoPassword); // BCrypt once, reused for all demo doctors
            }

            User user = userRepository.save(new User(d.email(), passwordHash, d.name(), null, Role.DOCTOR));

            Set<Specialization> specs = new LinkedHashSet<>();
            for (String specName : d.specializations()) {
                specializationRepository.findByName(specName).ifPresent(specs::add);
            }

            doctorProfileRepository.save(new DoctorProfile(
                    user, d.qualification(), d.bio(), d.experienceYears(),
                    new BigDecimal(d.fee()), d.clinicAddress(), d.status(), specs));
            created++;
        }

        if (created > 0) {
            log.info("Seeded {} demo doctor(s). Demo doctor password comes from DEMO_DOCTOR_PASSWORD.", created);
        }
    }
}
