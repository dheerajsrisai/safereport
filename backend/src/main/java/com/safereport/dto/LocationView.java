package com.safereport.dto;

import com.safereport.model.GeoPoint;
import java.time.LocalDateTime;
import java.util.List;

public record LocationView(boolean sharing, LocalDateTime lastAt, GeoPoint current, List<GeoPoint> trail) { }
