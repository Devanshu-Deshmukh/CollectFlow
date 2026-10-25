package com.collectflow.web.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public final class CustomerDtos {

    private CustomerDtos() {
    }

    public record CustomerRequest(
            @NotBlank @Size(max = 160) String name,
            @Email @Size(max = 190) String email,
            @Size(max = 40) String phone,
            @Size(max = 160) String company,
            @Size(max = 1000) String notes) {
    }

    public record CustomerDto(
            Long id,
            String name,
            String email,
            String phone,
            String company,
            String notes,
            LocalDateTime createdAt,
            BigDecimal outstanding,
            long invoiceCount,
            long overdueCount) {
    }
}
