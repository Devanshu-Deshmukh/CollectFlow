package com.collectflow.security;

import com.collectflow.domain.Business;
import com.collectflow.domain.User;
import com.collectflow.repo.BusinessRepository;
import com.collectflow.repo.UserRepository;
import com.collectflow.web.ApiException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
public class CurrentUser {

    private final UserRepository userRepository;
    private final BusinessRepository businessRepository;

    public CurrentUser(UserRepository userRepository, BusinessRepository businessRepository) {
        this.userRepository = userRepository;
        this.businessRepository = businessRepository;
    }

    public AuthUser principal() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof AuthUser authUser) {
            return authUser;
        }
        throw ApiException.unauthorized("Authentication required");
    }

    public Long userId() {
        return principal().userId();
    }

    public Long businessId() {
        Long businessId = principal().businessId();
        if (businessId == null) {
            throw ApiException.unauthorized("No business is linked to this account");
        }
        return businessId;
    }

    public User user() {
        return userRepository.findById(userId())
                .orElseThrow(() -> ApiException.unauthorized("Account no longer exists"));
    }

    public Business business() {
        return businessRepository.findById(businessId())
                .orElseThrow(() -> ApiException.unauthorized("Business no longer exists"));
    }
}
