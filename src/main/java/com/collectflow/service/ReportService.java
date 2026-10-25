package com.collectflow.service;

import com.collectflow.domain.Invoice;
import com.collectflow.repo.InvoiceRepository;
import com.collectflow.security.CurrentUser;
import com.collectflow.web.dto.InvoiceDtos;
import com.collectflow.web.dto.ReportDtos;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ReportService {

    private final InvoiceRepository invoiceRepository;
    private final DashboardService dashboardService;
    private final InvoiceService invoiceService;
    private final InvoiceStatusService statusService;
    private final CurrentUser currentUser;

    public ReportService(InvoiceRepository invoiceRepository,
                         DashboardService dashboardService,
                         InvoiceService invoiceService,
                         InvoiceStatusService statusService,
                         CurrentUser currentUser) {
        this.invoiceRepository = invoiceRepository;
        this.dashboardService = dashboardService;
        this.invoiceService = invoiceService;
        this.statusService = statusService;
        this.currentUser = currentUser;
    }

    @Transactional
    public ReportDtos.AgeingReportDto ageing() {
        Long businessId = currentUser.businessId();
        statusService.refreshBusiness(businessId);
        LocalDate today = LocalDate.now();
        List<Invoice> open = invoiceRepository.findOpenInvoices(businessId);

        Map<Long, List<Invoice>> grouped = open.stream()
                .collect(Collectors.groupingBy(invoice -> invoice.getCustomer().getId(), LinkedHashMap::new,
                        Collectors.toList()));

        List<ReportDtos.AgeingRowDto> rows = new ArrayList<>();
        for (List<Invoice> invoices : grouped.values()) {
            BigDecimal[] buckets = new BigDecimal[5];
            for (int i = 0; i < 5; i++) {
                buckets[i] = BigDecimal.ZERO;
            }
            BigDecimal total = BigDecimal.ZERO;
            for (Invoice invoice : invoices) {
                BigDecimal outstanding = invoice.outstandingAmount();
                buckets[DashboardService.Ageing.index(invoice, today)] =
                        buckets[DashboardService.Ageing.index(invoice, today)].add(outstanding);
                total = total.add(outstanding);
            }
            rows.add(new ReportDtos.AgeingRowDto(
                    invoices.getFirst().getCustomer().getId(),
                    invoices.getFirst().getCustomer().getName(),
                    buckets[0], buckets[1], buckets[2], buckets[3], buckets[4], total));
        }
        rows.sort(Comparator.comparing(ReportDtos.AgeingRowDto::total).reversed());

        return new ReportDtos.AgeingReportDto(
                today,
                dashboardService.ageingBuckets(open, today),
                rows,
                DashboardService.sum(open));
    }

    @Transactional
    public ReportDtos.OverdueReportDto overdue() {
        Long businessId = currentUser.businessId();
        statusService.refreshBusiness(businessId);
        LocalDate today = LocalDate.now();
        List<Invoice> overdue = invoiceRepository.findOverdue(businessId, today);
        List<InvoiceDtos.InvoiceSummaryDto> invoices = overdue.stream()
                .map(invoice -> invoiceService.toSummary(invoice, today))
                .toList();
        List<ReportDtos.OverdueRowDto> byCustomer = new ArrayList<>();
        for (ReportDtos.CustomerExposureDto exposure : dashboardService.overdueByCustomer(overdue, today)) {
            byCustomer.add(new ReportDtos.OverdueRowDto(
                    exposure.customerId(), exposure.customerName(), exposure.outstanding(),
                    exposure.invoiceCount(), exposure.oldestDaysOverdue()));
        }
        return new ReportDtos.OverdueReportDto(
                today,
                DashboardService.sum(overdue),
                overdue.size(),
                invoices,
                byCustomer);
    }

    /**
     * Outstanding balances grouped by when they were, or will be, due.
     * This is a due-date view of receivables, not a statistical forecast of collection probability.
     */
    @Transactional
    public ReportDtos.ExpectedCollectionsDto expectedCollections() {
        Long businessId = currentUser.businessId();
        statusService.refreshBusiness(businessId);
        LocalDate today = LocalDate.now();
        List<Invoice> open = invoiceRepository.findOpenInvoices(businessId);

        record Window(String label, LocalDate from, LocalDate to) {
        }
        List<Window> windows = List.of(
                new Window("Overdue", null, today.minusDays(1)),
                new Window("Due this week", today, today.plusDays(7)),
                new Window("Next 30 days", today.plusDays(8), today.plusDays(30)),
                new Window("31-60 days", today.plusDays(31), today.plusDays(60)),
                new Window("61-90 days", today.plusDays(61), today.plusDays(90)),
                new Window("Beyond 90 days", today.plusDays(91), null));

        List<ReportDtos.ExpectedWindowDto> result = new ArrayList<>();
        for (Window window : windows) {
            List<Invoice> matching = open.stream()
                    .filter(invoice -> (window.from() == null || !invoice.getDueDate().isBefore(window.from()))
                            && (window.to() == null || !invoice.getDueDate().isAfter(window.to())))
                    .toList();
            result.add(new ReportDtos.ExpectedWindowDto(
                    window.label(),
                    window.from(),
                    window.to(),
                    matching.size(),
                    DashboardService.sum(matching)));
        }

        Map<Long, List<Invoice>> grouped = open.stream()
                .collect(Collectors.groupingBy(invoice -> invoice.getCustomer().getId()));
        List<ReportDtos.CustomerExposureDto> exposures = new ArrayList<>();
        for (List<Invoice> invoices : grouped.values()) {
            long oldest = invoices.stream()
                    .filter(invoice -> invoice.getDueDate().isBefore(today))
                    .mapToLong(invoice -> ChronoUnit.DAYS.between(invoice.getDueDate(), today))
                    .max().orElse(0);
            exposures.add(new ReportDtos.CustomerExposureDto(
                    invoices.getFirst().getCustomer().getId(),
                    invoices.getFirst().getCustomer().getName(),
                    DashboardService.sum(invoices),
                    invoices.size(),
                    oldest));
        }
        exposures.sort(Comparator.comparing(ReportDtos.CustomerExposureDto::outstanding).reversed());

        return new ReportDtos.ExpectedCollectionsDto(
                today,
                DashboardService.sum(open),
                currentUser.business().getCurrency(),
                result,
                exposures.stream().limit(10).toList());
    }
}
