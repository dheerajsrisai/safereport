package com.safereport.dto;

import jakarta.validation.constraints.*;

public record LocationRequest(
        @NotBlank String code,
        @NotNull @DecimalMin("-90") @DecimalMax("90") Double lat,
        @NotNull @DecimalMin("-180") @DecimalMax("180") Double lng,
        @PositiveOrZero Double accuracy) { }
