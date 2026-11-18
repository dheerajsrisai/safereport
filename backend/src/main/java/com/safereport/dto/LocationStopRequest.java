package com.safereport.dto;

import jakarta.validation.constraints.NotBlank;

/** erase=true also deletes the saved position and trail. */
public record LocationStopRequest(@NotBlank String code, boolean erase) { }
