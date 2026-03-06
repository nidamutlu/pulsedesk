package com.pulsedesk.config;

import com.pulsedesk.user.domain.User;
import com.pulsedesk.user.domain.UserRole;
import com.pulsedesk.user.repo.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
@Profile({"local", "dev"})
public class SeedUsersConfig {

    private static final Logger log = LoggerFactory.getLogger(SeedUsersConfig.class);

    @Value("${pulsedesk.seed.password:Passw0rd!}")
    private String defaultPassword;

    @Value("${pulsedesk.seed.team-id:1}")
    private Long defaultTeamId;

    @Bean
    CommandLineRunner seedUsers(UserRepository users, PasswordEncoder encoder) {
        return args -> {
            log.info("Seeding default users (if missing)...");

            seedIfMissing(users, encoder, "admin", defaultPassword, UserRole.ADMIN, null);
            seedIfMissing(users, encoder, "agent1", defaultPassword, UserRole.AGENT, defaultTeamId);
            seedIfMissing(users, encoder, "requester1", defaultPassword, UserRole.REQUESTER, defaultTeamId);

            log.info("Users in DB after seed = {}", users.count());
        };
    }

    private void seedIfMissing(
            UserRepository users,
            PasswordEncoder encoder,
            String username,
            String rawPassword,
            UserRole role,
            Long teamId
    ) {
        if (users.existsByUsername(username)) {
            return;
        }

        users.save(new User(username, encoder.encode(rawPassword), role, teamId));
        log.info("Seeded user: username={}, role={}, teamId={}", username, role, teamId);
    }
}