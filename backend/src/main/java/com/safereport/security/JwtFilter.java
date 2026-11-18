package com.safereport.security;

import com.safereport.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.util.List;

/** Validates the JWT and re-checks the account in the database, so deactivated staff lose access immediately. */
public class JwtFilter extends OncePerRequestFilter {
    private final JwtUtil jwtUtil;
    private final UserRepository users;

    public JwtFilter(JwtUtil jwtUtil, UserRepository users) { this.jwtUtil = jwtUtil; this.users = users; }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        String header = req.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            try {
                String email = jwtUtil.parse(header.substring(7)).getSubject();
                users.findByEmail(email).filter(u -> u.isActive()).ifPresent(u -> {
                    var auth = new UsernamePasswordAuthenticationToken(
                            u.getEmail(), null, List.of(new SimpleGrantedAuthority("ROLE_" + u.getRole().name())));
                    SecurityContextHolder.getContext().setAuthentication(auth);
                });
            } catch (Exception ignored) { /* invalid or expired token -> unauthenticated */ }
        }
        chain.doFilter(req, res);
    }
}
