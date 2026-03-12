package com.pulsedesk.security;

import com.pulsedesk.config.JwtProperties;
import com.pulsedesk.user.domain.UserRole;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;

@Service
public class JwtService {

    private static final String CLAIM_TYP = "typ";
    private static final String TYP_ACCESS = "access";
    private static final String TYP_REFRESH = "refresh";

    private static final String CLAIM_UID = "uid";
    private static final String CLAIM_ROLE = "role";
    private static final String CLAIM_TEAM_ID = "teamId";

    private final JwtProperties props;
    private final SecretKey key;

    public JwtService(JwtProperties props) {
        this.props = props;
        this.key = Keys.hmacShaKeyFor(props.secret().getBytes(StandardCharsets.UTF_8));
    }

    public String generateAccessToken(Long userId, String username, UserRole role, Long teamId) {
        Instant now = Instant.now();
        Instant exp = now.plus(props.accessTtlMinutes(), ChronoUnit.MINUTES);

        return Jwts.builder()
                .subject(username)
                .claim(CLAIM_UID, userId)
                .claim(CLAIM_ROLE, role != null ? role.name() : null)
                .claim(CLAIM_TEAM_ID, teamId)
                .claim(CLAIM_TYP, TYP_ACCESS)
                .issuedAt(Date.from(now))
                .expiration(Date.from(exp))
                .signWith(key)
                .compact();
    }

    public String generateRefreshToken(String username) {
        Instant now = Instant.now();
        Instant exp = now.plus(props.refreshTtlDays(), ChronoUnit.DAYS);

        return Jwts.builder()
                .subject(username)
                .claim(CLAIM_TYP, TYP_REFRESH)
                .issuedAt(Date.from(now))
                .expiration(Date.from(exp))
                .signWith(key)
                .compact();
    }

    public Jws<Claims> parse(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token);
    }

    public boolean isAccessToken(Claims claims) {
        return TYP_ACCESS.equals(claims.get(CLAIM_TYP));
    }

    public boolean isRefreshToken(Claims claims) {
        return TYP_REFRESH.equals(claims.get(CLAIM_TYP));
    }

    public Long getUserId(Claims claims) {
        return asLong(claims.get(CLAIM_UID));
    }

    public UserRole getRole(Claims claims) {
        Object raw = claims.get(CLAIM_ROLE);
        if (raw instanceof String s && !s.isBlank()) {
            try {
                return UserRole.valueOf(s);
            } catch (IllegalArgumentException ignored) {
                return null;
            }
        }
        return null;
    }

    public Long getTeamId(Claims claims) {
        return asLong(claims.get(CLAIM_TEAM_ID));
    }

    private static Long asLong(Object raw) {
        if (raw instanceof Number n) {
            return n.longValue();
        }

        if (raw instanceof String s) {
            try {
                return Long.parseLong(s);
            } catch (NumberFormatException ignored) {
                return null;
            }
        }

        return null;
    }
}