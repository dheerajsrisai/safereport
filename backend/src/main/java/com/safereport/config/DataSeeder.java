package com.safereport.config;

import com.safereport.model.*;
import com.safereport.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/** Creates demo staff accounts on first start. CHANGE THESE PASSWORDS before any real deployment. */
@Component
public class DataSeeder implements CommandLineRunner {
    private final UserRepository users;
    private final PasswordEncoder encoder;

    public DataSeeder(UserRepository users, PasswordEncoder encoder) { this.users = users; this.encoder = encoder; }

    @Override
    public void run(String... args) {
        seed("Administrator", "admin@safereport.com", "admin123", Role.ADMIN, "ADM-001", "Headquarters");
        seed("Officer Demo", "officer@safereport.com", "officer123", Role.OFFICER, "OFF-101", "Central Station");
    }

    private void seed(String name, String email, String pw, Role role, String badge, String station) {
        if (users.existsByEmail(email)) return;
        User u = new User();
        u.setName(name); u.setEmail(email); u.setPasswordHash(encoder.encode(pw));
        u.setRole(role); u.setBadgeNo(badge); u.setStation(station);
        users.save(u);
        System.out.println(">> Demo " + role + " created: " + email + " / " + pw);
    }
}
