package com.collectflow.domain;

/**
 * When a reminder template fires relative to the invoice due date.
 * BEFORE_DUE subtracts offsetDays, AFTER_DUE adds offsetDays, ON_DUE ignores it.
 */
public enum ReminderTrigger {
    BEFORE_DUE,
    ON_DUE,
    AFTER_DUE
}
