package com.safereport.model;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.time.LocalDateTime;

/** Staff account (officer or admin). Citizens never have accounts. */
@Data @NoArgsConstructor
@Document(collection = "users")
public class User {
    @Id private String id;
    private String name;
    @Indexed(unique = true) private String email;
    @JsonIgnore private String passwordHash;
    private Role role;
    private String badgeNo;
    private String station;
    private boolean active = true;
    private LocalDateTime createdAt = LocalDateTime.now();
}
