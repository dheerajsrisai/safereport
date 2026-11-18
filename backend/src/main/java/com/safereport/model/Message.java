package com.safereport.model;

import lombok.*;
import java.time.LocalDateTime;

@Data @NoArgsConstructor @AllArgsConstructor
public class Message {
    private String author;        // officer name (null for the anonymous reporter)
    private boolean fromOfficer;
    private String text;
    private LocalDateTime createdAt = LocalDateTime.now();
}
