package com.safereport.dto;

import com.safereport.model.*;
import java.time.LocalDateTime;
import java.util.List;

/** What an anonymous reporter may see about their own report (no officer names, no internal notes). */
public record PublicReportView(Category category, String title, ReportStatus status,
                               LocalDateTime createdAt, LocalDateTime updatedAt,
                               int evidenceCount, List<PublicMessage> messages) { }
