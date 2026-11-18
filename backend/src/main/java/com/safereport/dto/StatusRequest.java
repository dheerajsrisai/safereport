package com.safereport.dto;
import com.safereport.model.*;
import jakarta.validation.constraints.NotNull;
public record StatusRequest(@NotNull ReportStatus status, Priority priority) { }
