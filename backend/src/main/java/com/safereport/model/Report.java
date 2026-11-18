package com.safereport.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/** A report holds NO personal data about the reporter. Only a SHA-256 hash of the tracking code is stored. */
@Data @NoArgsConstructor
@Document(collection = "reports")
public class Report {
    @Id private String id;
    @JsonIgnore @Indexed(unique = true) private String trackingHash;
    private Category category;
    private String title;
    private String description;
    private String location;
    private LocalDate incidentDate;
    private ReportStatus status = ReportStatus.SUBMITTED;
    private Priority priority = Priority.MEDIUM;
    private String assignedOfficerId;
    private String assignedOfficerName;
    private List<Evidence> evidence = new ArrayList<>();
    private List<Message> messages = new ArrayList<>();   // visible to the reporter
    private List<Message> notes = new ArrayList<>();      // internal, staff only
    private boolean reporterReplied;
    private boolean liveSharing;
    private LocalDateTime lastLocationAt;
    @JsonIgnore private GeoPoint liveLocation;                   // served only via the dedicated staff endpoints
    @JsonIgnore private List<GeoPoint> trail = new ArrayList<>(); // last 300 points
    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime updatedAt = LocalDateTime.now();
}
