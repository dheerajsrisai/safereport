package com.safereport.dto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
public record TrackMessageRequest(@NotBlank String code, @NotBlank @Size(max = 1500) String text) { }
