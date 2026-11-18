package com.safereport.dto;

import com.safereport.model.*;
import java.time.LocalDateTime;

public record LiveItem(String id, String title, Category category, Priority priority, ReportStatus status,
                       double lat, double lng, Double accuracy, LocalDateTime lastAt) { }
