package com.collectflow.repo;

import com.collectflow.domain.ReminderTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ReminderTemplateRepository extends JpaRepository<ReminderTemplate, Long> {

    List<ReminderTemplate> findByBusinessIdOrderByIdAsc(Long businessId);

    List<ReminderTemplate> findByBusinessIdAndActiveTrueOrderByOffsetDaysAsc(Long businessId);

    Optional<ReminderTemplate> findByIdAndBusinessId(Long id, Long businessId);

    boolean existsByBusinessIdAndActiveTrue(Long businessId);
}
