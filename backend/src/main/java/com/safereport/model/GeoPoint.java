package com.safereport.model;

import lombok.*;
import java.time.LocalDateTime;

@Data @NoArgsConstructor @AllArgsConstructor
public class GeoPoint {
    private double lat;
    private double lng;
    private Double accuracy;     // metres, as reported by the device
    private LocalDateTime at;
}
