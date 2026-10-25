package com.collectflow.web.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public final class PaymentDtos {

    private PaymentDtos() {
    }

    public record PaymentRequest(
            @NotNull @DecimalMin(value = "0.01", message = "amount must be greater than zero") BigDecimal amount,
            @NotNull LocalDate paymentDate,
            @Size(max = 32) String method,
            @Size(max = 120) String reference,
            @Size(max = 500) String notes) {
    }

    public record PaymentDto(
            Long id,
            Long invoiceId,
            String invoiceNumber,
            String customerName,
            BigDecimal amount,
            LocalDate paymentDate,
            String method,
            String reference,
            String notes,
            LocalDateTime createdAt) {
    }
}
