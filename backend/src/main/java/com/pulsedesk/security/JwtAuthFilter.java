package com.pulsedesk.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pulsedesk.common.api.ApiError;
import com.pulsedesk.user.domain.UserRole;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jws;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthFilter.class);

    private final JwtService jwtService;
    private final ObjectMapper objectMapper;

    public JwtAuthFilter(JwtService jwtService, ObjectMapper objectMapper) {
        this.jwtService = jwtService;
        this.objectMapper = objectMapper;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();
        return path.startsWith("/api/auth/")
                || path.equals("/actuator/health")
                || path.equals("/actuator/info")
                || path.equals("/error");
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        String authorizationHeader = request.getHeader(HttpHeaders.AUTHORIZATION);

        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authorizationHeader.substring("Bearer ".length()).trim();

        try {
            Jws<Claims> parsedToken = jwtService.parse(token);
            Claims claims = parsedToken.getPayload();

            if (!jwtService.isAccessToken(claims)) {
                SecurityContextHolder.clearContext();
                writeUnauthorized(
                        response,
                        ApiError.of("AUTH_TOKEN_INVALID", "Invalid access token")
                );
                return;
            }

            String username = claims.getSubject();
            Long userId = jwtService.getUserId(claims);

            if (username == null || username.isBlank() || userId == null || userId <= 0) {
                SecurityContextHolder.clearContext();
                writeUnauthorized(
                        response,
                        ApiError.of("AUTH_TOKEN_INVALID", "Invalid access token")
                );
                return;
            }

            if (SecurityContextHolder.getContext().getAuthentication() == null) {
                UserRole role = jwtService.getRole(claims);
                Long teamId = jwtService.getTeamId(claims);

                List<SimpleGrantedAuthority> authorities = role == null
                        ? List.of()
                        : List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));

                AuthPrincipal principal = new AuthPrincipal(userId, username, role, teamId);

                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(principal, null, authorities);

                authentication.setDetails(
                        new WebAuthenticationDetailsSource().buildDetails(request)
                );

                SecurityContextHolder.getContext().setAuthentication(authentication);
            }

            filterChain.doFilter(request, response);
        } catch (ExpiredJwtException ex) {
            SecurityContextHolder.clearContext();
            writeUnauthorized(
                    response,
                    ApiError.of("AUTH_TOKEN_EXPIRED", "Token expired")
            );
        } catch (JwtException ex) {
            SecurityContextHolder.clearContext();
            writeUnauthorized(
                    response,
                    ApiError.of("AUTH_TOKEN_INVALID", "Invalid access token")
            );
        } catch (Exception ex) {
            SecurityContextHolder.clearContext();
            log.error("Unexpected JWT filter error", ex);
            writeUnauthorized(
                    response,
                    ApiError.of("AUTH_TOKEN_INVALID", "Invalid access token")
            );
        }
    }

    private void writeUnauthorized(HttpServletResponse response, ApiError error) throws IOException {
        if (response.isCommitted()) {
            return;
        }

        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setHeader("Cache-Control", "no-store");

        objectMapper.writeValue(response.getWriter(), error);
        response.getWriter().flush();
    }
}