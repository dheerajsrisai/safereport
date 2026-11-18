package com.safereport.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Simple in-memory rate limiter against spam and brute force. IP addresses live only in memory
 * for the length of the window and are never written to the database or to logs.
 */
public class RateLimitFilter extends OncePerRequestFilter {
    private record Rule(String name, long windowMs, int max) { }

    private final Map<String, Deque<Long>> hits = new ConcurrentHashMap<>();
    private final Rule submit, track, login, loc;

    public RateLimitFilter(int submitPerHour) {
        this.submit = new Rule("submit", 3_600_000L, submitPerHour);
        this.track = new Rule("track", 600_000L, 30);
        this.login = new Rule("login", 600_000L, 10);
        this.loc = new Rule("loc", 600_000L, 200);   // live location: one update every few seconds
    }

    private Rule ruleFor(HttpServletRequest req) {
        if (!"POST".equals(req.getMethod())) return null;
        String p = req.getRequestURI();
        if (p.equals("/api/public/reports")) return submit;
        if (p.startsWith("/api/public/track/location")) return loc;
        if (p.startsWith("/api/public/track")) return track;
        if (p.equals("/api/auth/login")) return login;
        return null;
    }

    private String ip(HttpServletRequest req) {
        String real = req.getHeader("X-Real-IP");   // set by nginx in Docker
        return real != null && !real.isBlank() ? real : req.getRemoteAddr();
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        Rule rule = ruleFor(req);
        if (rule != null) {
            if (hits.size() > 20_000) hits.clear();   // keep memory bounded
            Deque<Long> d = hits.computeIfAbsent(rule.name() + ":" + ip(req), k -> new ArrayDeque<>());
            long now = System.currentTimeMillis();
            boolean blocked;
            synchronized (d) {
                while (!d.isEmpty() && now - d.peekFirst() > rule.windowMs()) d.pollFirst();
                blocked = d.size() >= rule.max();
                if (!blocked) d.addLast(now);
            }
            if (blocked) {
                res.setStatus(429);
                res.setContentType("application/json");
                res.getWriter().write("{\"message\":\"Too many requests. Please try again later.\"}");
                return;
            }
        }
        chain.doFilter(req, res);
    }
}
