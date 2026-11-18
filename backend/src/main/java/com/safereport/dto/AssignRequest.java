package com.safereport.dto;
import jakarta.validation.constraints.NotBlank;
public record AssignRequest(@NotBlank String officerId) { }
