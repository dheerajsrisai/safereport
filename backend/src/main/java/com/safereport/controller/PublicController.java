package com.safereport.controller;

import com.safereport.dto.*;
import com.safereport.service.ReportService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/** Anonymous endpoints: no login, no cookies, nothing about the caller is stored. */
@RestController
@RequestMapping("/api/public")
public class PublicController {
    private final ReportService service;

    public PublicController(ReportService service) { this.service = service; }

    @PostMapping(value = "/reports", consumes = "multipart/form-data")
    public Map<String, String> submit(@RequestParam String category,
                                      @RequestParam String title,
                                      @RequestParam String description,
                                      @RequestParam(required = false) String location,
                                      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate incidentDate,
                                      @RequestParam(value = "files", required = false) List<MultipartFile> files) {
        String code = service.submit(category, title, description, location, incidentDate, files);
        return Map.of("trackingCode", code);
    }

    // POST (not GET) so the tracking code never appears in URLs, browser history or server logs
    @PostMapping("/track")
    public PublicReportView track(@Valid @RequestBody TrackRequest r) { return service.track(r.code()); }

    @PostMapping("/track/message")
    public PublicReportView message(@Valid @RequestBody TrackMessageRequest r) {
        return service.reporterMessage(r.code(), r.text());
    }

    /** Opt-in live location. Called every few seconds by the browser while the reporter keeps sharing on. */
    @PostMapping("/track/location")
    public Map<String, Boolean> location(@Valid @RequestBody LocationRequest r) {
        service.updateLocation(r.code(), r.lat(), r.lng(), r.accuracy());
        return Map.of("ok", true);
    }

    @PostMapping("/track/location/stop")
    public Map<String, Boolean> stopLocation(@Valid @RequestBody LocationStopRequest r) {
        service.stopLocation(r.code(), r.erase());
        return Map.of("ok", true);
    }
}
