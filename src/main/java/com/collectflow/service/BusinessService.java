package com.collectflow.service;

import com.collectflow.domain.Business;
import com.collectflow.repo.BusinessMembershipRepository;
import com.collectflow.repo.BusinessRepository;
import com.collectflow.security.CurrentUser;
import com.collectflow.web.dto.BusinessDtos;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class BusinessService {

    private final BusinessRepository businessRepository;
    private final BusinessMembershipRepository membershipRepository;
    private final CurrentUser currentUser;

    public BusinessService(BusinessRepository businessRepository,
                           BusinessMembershipRepository membershipRepository,
                           CurrentUser currentUser) {
        this.businessRepository = businessRepository;
        this.membershipRepository = membershipRepository;
        this.currentUser = currentUser;
    }

    @Transactional(readOnly = true)
    public BusinessDtos.BusinessDto current() {
        return toDto(currentUser.business());
    }

    @Transactional
    public BusinessDtos.BusinessDto update(BusinessDtos.BusinessUpdateRequest request) {
        Business business = currentUser.business();
        business.setName(request.name().trim());
        business.setEmail(blankToNull(request.email()));
        business.setPhone(blankToNull(request.phone()));
        business.setAddress(blankToNull(request.address()));
        business.setCurrency(request.currency());
        return toDto(businessRepository.save(business));
    }

    @Transactional(readOnly = true)
    public List<BusinessDtos.MemberDto> members() {
        return membershipRepository.findWithUsersByBusinessId(currentUser.businessId()).stream()
                .map(m -> new BusinessDtos.MemberDto(
                        m.getUser().getId(),
                        m.getUser().getName(),
                        m.getUser().getEmail(),
                        m.getRole().name()))
                .toList();
    }

    public static BusinessDtos.BusinessDto toDto(Business business) {
        return new BusinessDtos.BusinessDto(
                business.getId(),
                business.getName(),
                business.getCurrency(),
                business.getEmail(),
                business.getPhone(),
                business.getAddress());
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
