package com.collectflow.service;

import com.collectflow.domain.Business;
import com.collectflow.domain.BusinessMembership;
import com.collectflow.domain.Role;
import com.collectflow.domain.User;
import com.collectflow.repo.BusinessMembershipRepository;
import com.collectflow.repo.BusinessRepository;
import com.collectflow.repo.UserRepository;
import com.collectflow.security.CurrentUser;
import com.collectflow.security.JwtService;
import com.collectflow.web.ApiException;
import com.collectflow.web.dto.AuthDtos;
import com.collectflow.web.dto.BusinessDtos;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Locale;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final BusinessRepository businessRepository;
    private final BusinessMembershipRepository membershipRepository;
    private final ReminderTemplateService templateService;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final CurrentUser currentUser;

    public AuthService(UserRepository userRepository,
                       BusinessRepository businessRepository,
                       BusinessMembershipRepository membershipRepository,
                       ReminderTemplateService templateService,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       CurrentUser currentUser) {
        this.userRepository = userRepository;
        this.businessRepository = businessRepository;
        this.membershipRepository = membershipRepository;
        this.templateService = templateService;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.currentUser = currentUser;
    }

    @Transactional
    public AuthDtos.AuthResponse register(AuthDtos.RegisterRequest request) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw ApiException.conflict("An account with this email already exists");
        }

        User user = new User(request.name().trim(), email, passwordEncoder.encode(request.password()));
        user.setCreatedAt(LocalDateTime.now());
        userRepository.save(user);

        Business business = new Business();
        business.setName(request.businessName().trim());
        business.setCurrency(request.currency() == null ? "INR" : request.currency());
        business.setEmail(email);
        business.setCreatedAt(LocalDateTime.now());
        businessRepository.save(business);

        BusinessMembership membership = new BusinessMembership(user, business, Role.OWNER);
        membership.setCreatedAt(LocalDateTime.now());
        membershipRepository.save(membership);

        templateService.seedDefaults(business);

        String token = jwtService.issue(user.getId(), business.getId(), user.getEmail());
        return new AuthDtos.AuthResponse(token, jwtService.ttlSeconds(), toUserDto(user),
                BusinessService.toDto(business), Role.OWNER.name());
    }

    @Transactional(readOnly = true)
    public AuthDtos.AuthResponse login(AuthDtos.LoginRequest request) {
        User user = userRepository.findByEmailIgnoreCase(request.email().trim())
                .orElseThrow(() -> ApiException.unauthorized("Incorrect email or password"));
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw ApiException.unauthorized("Incorrect email or password");
        }
        BusinessMembership membership = membershipRepository.findFirstByUserIdOrderByIdAsc(user.getId())
                .orElseThrow(() -> ApiException.unauthorized("This account is not linked to a business"));
        String token = jwtService.issue(user.getId(), membership.getBusiness().getId(), user.getEmail());
        return new AuthDtos.AuthResponse(token, jwtService.ttlSeconds(), toUserDto(user),
                BusinessService.toDto(membership.getBusiness()), membership.getRole().name());
    }

    @Transactional(readOnly = true)
    public AuthDtos.SessionResponse session() {
        User user = currentUser.user();
        Business business = currentUser.business();
        BusinessMembership membership = membershipRepository
                .findFirstByUserIdOrderByIdAsc(user.getId())
                .orElseThrow(() -> ApiException.unauthorized("This account is not linked to a business"));
        return new AuthDtos.SessionResponse(toUserDto(user), BusinessService.toDto(business), membership.getRole().name());
    }

    private AuthDtos.UserDto toUserDto(User user) {
        return new AuthDtos.UserDto(user.getId(), user.getName(), user.getEmail());
    }
}
