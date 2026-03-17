package com.pulsedesk.savedview.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Entity
@Table(name = "saved_views")
@Getter
@NoArgsConstructor
public class SavedView {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "owner_id", nullable = false)
    private Long ownerId;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "filter_json", nullable = false, columnDefinition = "TEXT")
    private String filterJson;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    public SavedView(Long ownerId, String name, String filterJson, OffsetDateTime createdAt) {
        this.ownerId = ownerId;
        this.name = name;
        this.filterJson = filterJson;
        this.createdAt = createdAt;
    }
}