package com.safereport.dto;

import com.safereport.model.Role;
import jakarta.validation.constraints.*;

public record CreateOfficerRequest(
        @NotBlank String name,
        @NotBlank @Email String email,
        @NotBlank @Size(min = 8, message = "Password must be at least 8 characters") String password,
        String badgeNo, String station, Role role) { }
