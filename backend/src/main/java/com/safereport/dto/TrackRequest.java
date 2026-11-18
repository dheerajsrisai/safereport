package com.safereport.dto;
import jakarta.validation.constraints.NotBlank;
public record TrackRequest(@NotBlank String code) { }
