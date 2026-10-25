package com.collectflow.web.dto;

import com.collectflow.domain.ReminderTrigger;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public final class ReminderDtos {

    private ReminderDtos() {
    }

    public record TemplateRequest(
            @NotBlank @Size(max = 120) String name,
            @NotNull ReminderTrigger triggerType,
            @Min(0) @Max(365) int offsetDays,
            @NotBlank @Size(max = 250) String subject,
            @NotBlank @Size(max = 4000) String body,
            boolean active) {
    }

    public record TemplateDto(
            Long id,
            String name,
            ReminderTrigger triggerType,
            int offsetDays,
            String subject,
            String body,
            boolean active) {
    }

    public record ReminderDto(
            Long id,
            Long invoiceId,
            String invoiceNumber,
            Long customerId,
            String customerName,
            String recipientEmail,
            LocalDateTime scheduledAt,
            LocalDateTime sentAt,
            String status,
            String subject,
            String body,
            String note,
            Long templateId,
            String templateName) {
    }

    /** Manually send a reminder now. Template is optional: the body is rendered from it when supplied. */
    public record SendReminderRequest(Long templateId) {
    }
}
