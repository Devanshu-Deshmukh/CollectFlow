package com.collectflow.web.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class BusinessDtos {

    private BusinessDtos() {
    }

    public record BusinessDto(
            Long id,
            String name,
            String currency,
            String email,
            String phone,
            String address) {
    }

    public record BusinessUpdateRequest(
            @NotBlank @Size(max = 160) String name,
            @Email @Size(max = 190) String email,
            @Size(max = 40) String phone,
            @Size(max = 500) String address,
            @NotBlank @Pattern(regexp = "[A-Z]{3}", message = "must be a 3-letter currency code") String currency) {
    }

    public record MemberDto(Long userId, String name, String email, String role) {
    }
}
