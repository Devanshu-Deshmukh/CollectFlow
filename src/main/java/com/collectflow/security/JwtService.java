package com.collectflow.security;

import com.collectflow.config.AppProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.Optional;

@Service
public class JwtService {

    private final SecretKey key;
    private final long ttlHours;

    public JwtService(AppProperties properties) {
        String secret = properties.getJwt().getSecret();
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException("app.jwt.secret must be configured");
        }
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.ttlHours = properties.getJwt().getTtlHours();
    }

    public String issue(Long userId, Long businessId, String email) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim("businessId", businessId)
                .claim("email", email)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(ttlHours, ChronoUnit.HOURS)))
                .signWith(key)
                .compact();
    }

    public Optional<AuthUser> parse(String token) {
        try {
            Claims claims = Jwts.parser().verifyWith(key).build()
                    .parseSignedClaims(token)
                    .getPayload();
            Number businessId = claims.get("businessId", Number.class);
            return Optional.of(new AuthUser(
                    Long.valueOf(claims.getSubject()),
                    businessId == null ? null : businessId.longValue(),
                    claims.get("email", String.class)));
        } catch (JwtException | IllegalArgumentException ex) {
            return Optional.empty();
        }
    }

    public long ttlSeconds() {
        return ttlHours * 3600;
    }
}
