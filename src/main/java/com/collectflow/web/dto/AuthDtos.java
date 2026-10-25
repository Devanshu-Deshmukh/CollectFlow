package com.collectflow.web.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class AuthDtos {

    private AuthDtos() {
    }

    public record RegisterRequest(
            @NotBlank @Size(max = 120) String name,
            @NotBlank @Email @Size(max = 190) String email,
            @NotBlank @Size(min = 8, max = 72) String password,
            @NotBlank @Size(max = 160) String businessName,
            @Pattern(regexp = "[A-Z]{3}", message = "must be a 3-letter currency code") String currency) {
    }

    public record LoginRequest(
            @NotBlank @Email String email,
            @NotBlank String password) {
    }

    public record AuthResponse(
            String token,
            long expiresInSeconds,
            UserDto user,
            BusinessDtos.BusinessDto business,
            String role) {
    }

    public record UserDto(Long id, String name, String email) {
    }

    public record SessionResponse(
            UserDto user,
            BusinessDtos.BusinessDto business,
            String role) {
    }
}
