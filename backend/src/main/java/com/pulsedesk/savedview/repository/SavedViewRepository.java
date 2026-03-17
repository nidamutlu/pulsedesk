package com.pulsedesk.savedview.repository;

import com.pulsedesk.savedview.domain.SavedView;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SavedViewRepository extends JpaRepository<SavedView, Long> {

    List<SavedView> findAllByOwnerIdOrderByCreatedAtDesc(Long ownerId);

    Optional<SavedView> findByIdAndOwnerId(Long id, Long ownerId);
}