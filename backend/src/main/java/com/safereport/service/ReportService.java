package com.safereport.service;

import com.safereport.dto.*;
import com.safereport.exception.ApiException;
import com.safereport.model.*;
import com.safereport.repository.ReportRepository;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class ReportService {
    private final ReportRepository reports;
    private final TrackingCodeService codes;
    private final EvidenceStorageService storage;
    private final MongoTemplate mongo;

    public ReportService(ReportRepository reports, TrackingCodeService codes, EvidenceStorageService storage, MongoTemplate mongo) {
        this.reports = reports; this.codes = codes; this.storage = storage; this.mongo = mongo;
    }

    // ---------------- anonymous side ----------------

    /** Returns the tracking code. It is shown once and cannot be recovered. */
    public String submit(String category, String title, String description, String location,
                         LocalDate incidentDate, List<MultipartFile> files) {
        Category cat;
        try { cat = Category.valueOf(category.trim().toUpperCase()); }
        catch (Exception e) { throw new ApiException(HttpStatus.BAD_REQUEST, "Choose a valid category"); }
        title = title == null ? "" : title.trim();
        description = description == null ? "" : description.trim();
        if (title.length() < 3 || title.length() > 150)
            throw new ApiException(HttpStatus.BAD_REQUEST, "Title must be 3 to 150 characters");
        if (description.length() < 10 || description.length() > 5000)
            throw new ApiException(HttpStatus.BAD_REQUEST, "Description must be 10 to 5000 characters");
        if (incidentDate != null && incidentDate.isAfter(LocalDate.now()))
            throw new ApiException(HttpStatus.BAD_REQUEST, "Incident date cannot be in the future");
        List<MultipartFile> real = files == null ? List.of() : files.stream().filter(f -> !f.isEmpty()).toList();
        if (real.size() > 8) throw new ApiException(HttpStatus.BAD_REQUEST, "You can attach up to 8 files");

        Report r = new Report();
        r.setCategory(cat);
        r.setTitle(title);
        r.setDescription(description);
        r.setLocation(location == null ? null : location.trim());
        r.setIncidentDate(incidentDate);
        for (int i = 0; i < real.size(); i++) r.getEvidence().add(storage.store(real.get(i), i));

        String code = codes.generate();
        r.setTrackingHash(codes.hash(code));
        reports.save(r);
        return code;
    }

    private Report byCode(String code) {
        return reports.findByTrackingHash(codes.hash(code))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "No report found for that code"));
    }

    public PublicReportView track(String code) { return view(byCode(code)); }

    public PublicReportView reporterMessage(String code, String text) {
        Report r = byCode(code);
        r.getMessages().add(new Message(null, false, text.trim(), LocalDateTime.now()));
        r.setReporterReplied(true);
        r.setUpdatedAt(LocalDateTime.now());
        reports.save(r);
        return view(r);
    }

    private PublicReportView view(Report r) {
        return new PublicReportView(r.getCategory(), r.getTitle(), r.getStatus(), r.getCreatedAt(), r.getUpdatedAt(),
                r.getEvidence().size(),
                r.getMessages().stream().map(m -> new PublicMessage(m.isFromOfficer(), m.getText(), m.getCreatedAt())).toList());
    }

    // ---------------- staff side ----------------

    /** Admins see everything; officers see unassigned reports and the ones assigned to them. */
    private boolean canAccess(Report r, User u) {
        return u.getRole() == Role.ADMIN || r.getAssignedOfficerId() == null || r.getAssignedOfficerId().equals(u.getId());
    }

    public List<Report> listFor(User u) {
        return reports.findAllByOrderByCreatedAtDesc().stream().filter(r -> canAccess(r, u)).toList();
    }

    public Report getAccessible(String id, User u) {
        Report r = reports.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Report not found"));
        if (!canAccess(r, u)) throw new ApiException(HttpStatus.FORBIDDEN, "This report is assigned to another officer");
        return r;
    }

    private void autoClaim(Report r, User u) {
        if (r.getAssignedOfficerId() == null) { r.setAssignedOfficerId(u.getId()); r.setAssignedOfficerName(u.getName()); }
    }

    public Report claim(String id, User u) {
        Report r = getAccessible(id, u);
        if (r.getAssignedOfficerId() != null && !r.getAssignedOfficerId().equals(u.getId()))
            throw new ApiException(HttpStatus.CONFLICT, "Already assigned to " + r.getAssignedOfficerName());
        autoClaim(r, u);
        r.setUpdatedAt(LocalDateTime.now());
        return reports.save(r);
    }

    public Report updateStatus(String id, User u, ReportStatus status, Priority priority) {
        Report r = getAccessible(id, u);
        autoClaim(r, u);
        r.setStatus(status);
        if (priority != null) r.setPriority(priority);
        r.getNotes().add(new Message(u.getName(), true, "Status set to " + status + (priority != null ? ", priority " + priority : ""), LocalDateTime.now()));
        r.setUpdatedAt(LocalDateTime.now());
        return reports.save(r);
    }

    public Report reply(String id, User u, String text) {
        Report r = getAccessible(id, u);
        autoClaim(r, u);
        r.getMessages().add(new Message(u.getName(), true, text.trim(), LocalDateTime.now()));
        r.setReporterReplied(false);
        r.setUpdatedAt(LocalDateTime.now());
        return reports.save(r);
    }

    public Report addNote(String id, User u, String text) {
        Report r = getAccessible(id, u);
        r.getNotes().add(new Message(u.getName(), true, text.trim(), LocalDateTime.now()));
        r.setUpdatedAt(LocalDateTime.now());
        return reports.save(r);
    }

    public Report assign(String id, User officer) {
        Report r = reports.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Report not found"));
        r.setAssignedOfficerId(officer.getId());
        r.setAssignedOfficerName(officer.getName());
        r.getNotes().add(new Message("Admin", true, "Assigned to " + officer.getName(), LocalDateTime.now()));
        r.setUpdatedAt(LocalDateTime.now());
        return reports.save(r);
    }

    // ---------------- live location ----------------

    private Query byHash(String code) { return Query.query(Criteria.where("trackingHash").is(codes.hash(code))); }

    /** Atomic update: always refreshes the current position and timestamp; appends to the trail
     *  (max 300 points) only when the reporter moved at least 3 m since the last stored position. */
    public void updateLocation(String code, double lat, double lng, Double accuracy) {
        Query probe = byHash(code);
        probe.fields().include("liveLocation");
        Report prev = mongo.findOne(probe, Report.class);
        if (prev == null) throw new ApiException(HttpStatus.NOT_FOUND, "No report found for that code");

        GeoPoint p = new GeoPoint(lat, lng, accuracy, LocalDateTime.now());
        Update u = new Update().set("liveLocation", p).set("liveSharing", true).set("lastLocationAt", p.getAt());
        GeoPoint last = prev.getLiveLocation();
        if (last == null || distanceMeters(last.getLat(), last.getLng(), lat, lng) >= 3) u.push("trail").slice(-300).each(p);
        mongo.updateFirst(byHash(code), u, Report.class);
    }

    private static double distanceMeters(double lat1, double lng1, double lat2, double lng2) {
        double r = 6371000, dLat = Math.toRadians(lat2 - lat1), dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return 2 * r * Math.asin(Math.min(1, Math.sqrt(a)));
    }

    public void stopLocation(String code, boolean erase) {
        Update u = new Update().set("liveSharing", false);
        if (erase) u.set("liveLocation", null).set("lastLocationAt", null).set("trail", new ArrayList<GeoPoint>());
        if (mongo.updateFirst(byHash(code), u, Report.class).getMatchedCount() == 0)
            throw new ApiException(HttpStatus.NOT_FOUND, "No report found for that code");
    }

    public LocationView location(String id, User u) {
        Report r = getAccessible(id, u);
        return new LocationView(r.isLiveSharing(), r.getLastLocationAt(), r.getLiveLocation(), r.getTrail());
    }

    /** Reports whose reporter is currently sharing a location, limited to what this staff member may access. */
    public List<LiveItem> live(User u) {
        return listFor(u).stream()
                .filter(r -> r.isLiveSharing() && r.getLiveLocation() != null)
                .map(r -> new LiveItem(r.getId(), r.getTitle(), r.getCategory(), r.getPriority(), r.getStatus(),
                        r.getLiveLocation().getLat(), r.getLiveLocation().getLng(),
                        r.getLiveLocation().getAccuracy(), r.getLastLocationAt()))
                .toList();
    }
}
