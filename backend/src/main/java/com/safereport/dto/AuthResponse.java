package com.safereport.dto;
import com.safereport.model.Role;
public record AuthResponse(String token, String id, String name, String email, Role role) { }
