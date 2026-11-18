package com.safereport.model;

import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor
public class Evidence {
    private String fileName;     // random stored name
    private String label;        // generic label, e.g. evidence-1.jpg (original name is never kept)
    private String contentType;
    private long size;
}
