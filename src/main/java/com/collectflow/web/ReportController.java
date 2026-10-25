package com.collectflow.web;

import com.collectflow.service.ReportService;
import com.collectflow.web.dto.ReportDtos;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final ReportService reportService;

    public ReportController(ReportService reportService) {
        this.reportService = reportService;
    }

    @GetMapping("/ageing")
    public ReportDtos.AgeingReportDto ageing() {
        return reportService.ageing();
    }

    @GetMapping("/overdue")
    public ReportDtos.OverdueReportDto overdue() {
        return reportService.overdue();
    }

    @GetMapping("/expected-collections")
    public ReportDtos.ExpectedCollectionsDto expectedCollections() {
        return reportService.expectedCollections();
    }
}
