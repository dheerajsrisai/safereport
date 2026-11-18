package com.safereport.controller;

import com.safereport.dto.*;
import com.safereport.exception.ApiException;
import com.safereport.model.*;
import com.safereport.repository.*;
import com.safereport.service.ReportService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private final UserRepository users;
    private final ReportRepository reports;
    private final ReportService service;
    private final PasswordEncoder encoder;

    public AdminController(UserRepository users, ReportRepository reports, ReportService service, PasswordEncoder encoder) {
        this.users = users; this.reports = reports; this.service = service; this.encoder = encoder;
    }

    @GetMapping("/officers")
    public List<User> officers() { return users.findAll(); }

    @PostMapping("/officers")
    public User create(@Valid @RequestBody CreateOfficerRequest r) {
        String email = r.email().trim().toLowerCase();
        if (users.existsByEmail(email)) throw new ApiException(HttpStatus.CONFLICT, "Email is already registered");
        User u = new User();
        u.setName(r.name().trim());
        u.setEmail(email);
        u.setPasswordHash(encoder.encode(r.password()));
        u.setRole(r.role() == Role.ADMIN ? Role.ADMIN : Role.OFFICER);
        u.setBadgeNo(r.badgeNo());
        u.setStation(r.station());
        return users.save(u);
    }

    @PutMapping("/officers/{id}/active")
    public User active(@PathVariable String id, @RequestBody Map<String, Boolean> body) {
        User u = users.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Officer not found"));
        u.setActive(Boolean.TRUE.equals(body.get("active")));
        return users.save(u);
    }

    @PutMapping("/reports/{id}/assign")
    public Report assign(@PathVariable String id, @Valid @RequestBody AssignRequest r) {
        User officer = users.findById(r.officerId()).filter(User::isActive)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Active officer not found"));
        return service.assign(id, officer);
    }

    @GetMapping("/stats")
    public Map<String, Object> stats() {
        List<Report> all = reports.findAll();
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("total", all.size());
        m.put("unassigned", all.stream().filter(r -> r.getAssignedOfficerId() == null).count());
        m.put("newReplies", all.stream().filter(Report::isReporterReplied).count());
        m.put("officers", users.findAll().stream().filter(u -> u.getRole() == Role.OFFICER && u.isActive()).count());
        m.put("byStatus", all.stream().collect(Collectors.groupingBy(r -> r.getStatus().name(), Collectors.counting())));
        m.put("byCategory", all.stream().collect(Collectors.groupingBy(r -> r.getCategory().name(), Collectors.counting())));
        return m;
    }
}
