package com.collectflow.web.dto;

import com.collectflow.domain.FollowUpStatus;
import com.collectflow.domain.FollowUpType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalDateTime;

public final class FollowUpDtos {

    private FollowUpDtos() {
    }

    public record StatusUpdate(@NotNull FollowUpStatus status) {
    }

    public record FollowUpRequest(
            @NotNull FollowUpType activityType,
            @NotBlank @Size(max = 2000) String notes,
            Long assignedToUserId,
            LocalDate dueDate,
            FollowUpStatus status) {
    }

    public record FollowUpDto(
            Long id,
            Long invoiceId,
            String invoiceNumber,
            String customerName,
            String activityType,
            String notes,
            Long createdByUserId,
            String createdByName,
            Long assignedToUserId,
            String assignedToName,
            LocalDate dueDate,
            String status,
            LocalDateTime createdAt,
            LocalDateTime completedAt) {
    }
}
