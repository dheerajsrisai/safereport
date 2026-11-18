package com.safereport.controller;

import com.safereport.dto.*;
import com.safereport.exception.ApiException;
import com.safereport.repository.UserRepository;
import com.safereport.security.JwtUtil;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

/** Staff login only. Citizens do not have accounts, which is what keeps them anonymous. */
@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JwtUtil jwt;

    public AuthController(UserRepository users, PasswordEncoder encoder, JwtUtil jwt) {
        this.users = users; this.encoder = encoder; this.jwt = jwt;
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest r) {
        var u = users.findByEmail(r.email().trim().toLowerCase())
                .filter(x -> x.isActive() && encoder.matches(r.password(), x.getPasswordHash()))
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));
        return new AuthResponse(jwt.generate(u.getEmail()), u.getId(), u.getName(), u.getEmail(), u.getRole());
    }
}
