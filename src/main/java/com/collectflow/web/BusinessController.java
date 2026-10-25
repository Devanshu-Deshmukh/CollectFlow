package com.collectflow.web;

import com.collectflow.service.BusinessService;
import com.collectflow.web.dto.BusinessDtos;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/business")
public class BusinessController {

    private final BusinessService businessService;

    public BusinessController(BusinessService businessService) {
        this.businessService = businessService;
    }

    @GetMapping
    public BusinessDtos.BusinessDto current() {
        return businessService.current();
    }

    @PutMapping
    public BusinessDtos.BusinessDto update(@Valid @RequestBody BusinessDtos.BusinessUpdateRequest request) {
        return businessService.update(request);
    }

    @GetMapping("/members")
    public List<BusinessDtos.MemberDto> members() {
        return businessService.members();
    }
}
