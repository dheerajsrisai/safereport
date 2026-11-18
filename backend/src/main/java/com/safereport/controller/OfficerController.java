package com.safereport.controller;

import com.safereport.dto.*;
import com.safereport.exception.ApiException;
import com.safereport.model.*;
import com.safereport.repository.UserRepository;
import com.safereport.service.*;
import jakarta.validation.Valid;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/officer")
public class OfficerController {
    private final ReportService service;
    private final EvidenceStorageService storage;
    private final UserRepository users;

    public OfficerController(ReportService service, EvidenceStorageService storage, UserRepository users) {
        this.service = service; this.storage = storage; this.users = users;
    }

    private User me(Authentication auth) { return users.findByEmail(auth.getName()).orElseThrow(); }

    @GetMapping("/reports")
    public List<Report> list(Authentication auth) { return service.listFor(me(auth)); }

    @GetMapping("/reports/{id}")
    public Report one(Authentication auth, @PathVariable String id) { return service.getAccessible(id, me(auth)); }

    @PutMapping("/reports/{id}/claim")
    public Report claim(Authentication auth, @PathVariable String id) { return service.claim(id, me(auth)); }

    @PutMapping("/reports/{id}/status")
    public Report status(Authentication auth, @PathVariable String id, @Valid @RequestBody StatusRequest r) {
        return service.updateStatus(id, me(auth), r.status(), r.priority());
    }

    @PostMapping("/reports/{id}/messages")
    public Report reply(Authentication auth, @PathVariable String id, @Valid @RequestBody TextRequest r) {
        return service.reply(id, me(auth), r.text());
    }

    @PostMapping("/reports/{id}/notes")
    public Report note(Authentication auth, @PathVariable String id, @Valid @RequestBody TextRequest r) {
        return service.addNote(id, me(auth), r.text());
    }

    /** Evidence is only served to authorised staff who can access the report. */
    @GetMapping("/evidence/{reportId}/{fileName:.+}")
    public ResponseEntity<Resource> evidence(Authentication auth, @PathVariable String reportId, @PathVariable String fileName) {
        Report r = service.getAccessible(reportId, me(auth));
        Evidence ev = r.getEvidence().stream().filter(e -> e.getFileName().equals(fileName)).findFirst()
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Evidence not found"));
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(ev.getContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + ev.getLabel() + "\"")
                .body(storage.load(ev.getFileName()));
    }

    /** Polled by the case page map. */
    @GetMapping("/reports/{id}/location")
    public LocationView location(Authentication auth, @PathVariable String id) {
        return service.location(id, me(auth));
    }

    /** Polled by the live overview map: every report that is sharing a location right now. */
    @GetMapping("/live")
    public List<LiveItem> live(Authentication auth) { return service.live(me(auth)); }
}
