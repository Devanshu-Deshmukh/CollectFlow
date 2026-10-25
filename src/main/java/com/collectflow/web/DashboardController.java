package com.collectflow.web;

import com.collectflow.service.DashboardService;
import com.collectflow.web.dto.ReportDtos;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping
    public ReportDtos.DashboardDto dashboard() {
        return dashboardService.dashboard();
    }
}
