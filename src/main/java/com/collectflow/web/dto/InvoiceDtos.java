package com.collectflow.web.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public final class InvoiceDtos {

    private InvoiceDtos() {
    }

    public record InvoiceLineRequest(
            @NotBlank @Size(max = 300) String description,
            @NotNull @DecimalMin(value = "0.01", message = "quantity must be greater than zero") BigDecimal quantity,
            @NotNull @DecimalMin(value = "0.00") BigDecimal unitPrice) {
    }

    public record InvoiceRequest(
            @NotNull Long customerId,
            @Size(max = 40) String invoiceNumber,
            @NotNull LocalDate issueDate,
            @NotNull LocalDate dueDate,
            @Size(max = 1000) String notes,
            @NotEmpty @Valid List<InvoiceLineRequest> lines) {
    }

    public record InvoiceLineDto(
            Long id,
            String description,
            BigDecimal quantity,
            BigDecimal unitPrice,
            BigDecimal amount) {
    }

    public record InvoiceDto(
            Long id,
            String invoiceNumber,
            Long customerId,
            String customerName,
            String customerEmail,
            String customerPhone,
            LocalDate issueDate,
            LocalDate dueDate,
            String currency,
            String status,
            boolean overdue,
            long daysOverdue,
            BigDecimal totalAmount,
            BigDecimal amountPaid,
            BigDecimal outstandingAmount,
            String notes,
            LocalDateTime createdAt,
            List<InvoiceLineDto> lines,
            int followUpCount,
            int reminderCount) {
    }

    public record InvoiceSummaryDto(
            Long id,
            String invoiceNumber,
            Long customerId,
            String customerName,
            LocalDate issueDate,
            LocalDate dueDate,
            String currency,
            String status,
            boolean overdue,
            long daysOverdue,
            BigDecimal totalAmount,
            BigDecimal amountPaid,
            BigDecimal outstandingAmount) {
    }
}
