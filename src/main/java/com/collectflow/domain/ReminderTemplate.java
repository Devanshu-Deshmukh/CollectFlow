package com.collectflow.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "reminder_templates")
@Getter
@Setter
@NoArgsConstructor
public class ReminderTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "business_id", nullable = false)
    private Business business;

    @Column(nullable = false, length = 120)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "trigger_type", nullable = false, length = 20)
    private ReminderTrigger triggerType = ReminderTrigger.BEFORE_DUE;

    @Column(name = "offset_days", nullable = false)
    private int offsetDays;

    @Column(nullable = false, length = 250)
    private String subject;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String body;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    /**
     * Date on which this template's reminder should go out for an invoice due on the given date.
     */
    public LocalDateTime scheduledFor(java.time.LocalDate dueDate) {
        java.time.LocalDate day = switch (triggerType) {
            case BEFORE_DUE -> dueDate.minusDays(offsetDays);
            case ON_DUE -> dueDate;
            case AFTER_DUE -> dueDate.plusDays(offsetDays);
        };
        return day.atTime(9, 0);
    }
}
