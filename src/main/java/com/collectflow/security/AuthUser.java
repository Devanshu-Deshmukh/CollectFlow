package com.collectflow.security;

public record AuthUser(Long userId, Long businessId, String email) {
}
