package com.safereport.dto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
public record TextRequest(@NotBlank @Size(max = 2000) String text) { }
