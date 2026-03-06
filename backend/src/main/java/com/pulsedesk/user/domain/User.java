package com.pulsedesk.user.domain;

import jakarta.persistence.*;

@Entity
@Table(
        name = "users",
        indexes = @Index(name = "ix_users_username", columnList = "username", unique = true)
)
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 80, unique = true)
    private String username;

    @Column(name = "password_hash", nullable = false, length = 120)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserRole role;

    @Column(name = "team_id")
    private Long teamId;

    protected User() {}

    public User(String username, String passwordHash, UserRole role, Long teamId) {
        this.username = username;
        this.passwordHash = passwordHash;
        this.role = role;
        this.teamId = teamId;
    }

    public Long getId() { return id; }

    public String getUsername() { return username; }

    public String getPasswordHash() { return passwordHash; }

    public UserRole getRole() { return role; }

    public Long getTeamId() { return teamId; }
}