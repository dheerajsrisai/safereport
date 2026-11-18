package com.safereport.dto;
import java.time.LocalDateTime;
public record PublicMessage(boolean fromOfficer, String text, LocalDateTime createdAt) { }
