package com.collectflow.service;

import com.collectflow.domain.FollowUpStatus;
import com.collectflow.domain.Invoice;
import com.collectflow.domain.InvoiceStatus;
import com.collectflow.domain.ReminderStatus;
import com.collectflow.repo.CustomerRepository;
import com.collectflow.repo.FollowUpRepository;
import com.collectflow.repo.InvoiceRepository;
import com.collectflow.repo.PaymentRepository;
import com.collectflow.repo.ReminderRepository;
import com.collectflow.security.CurrentUser;
import com.collectflow.web.dto.PaymentDtos;
import com.collectflow.web.dto.ReportDtos;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class DashboardService {

    private final InvoiceRepository invoiceRepository;
    private final PaymentRepository paymentRepository;
    private final FollowUpRepository followUpRepository;
    private final ReminderRepository reminderRepository;
    private final CustomerRepository customerRepository;
    private final PaymentService paymentService;
    private final InvoiceStatusService statusService;
    private final CurrentUser currentUser;

    public DashboardService(InvoiceRepository invoiceRepository,
                            PaymentRepository paymentRepository,
                            FollowUpRepository followUpRepository,
                            ReminderRepository reminderRepository,
                            CustomerRepository customerRepository,
                            PaymentService paymentService,
                            InvoiceStatusService statusService,
                            CurrentUser currentUser) {
        this.invoiceRepository = invoiceRepository;
        this.paymentRepository = paymentRepository;
        this.followUpRepository = followUpRepository;
        this.reminderRepository = reminderRepository;
        this.customerRepository = customerRepository;
        this.paymentService = paymentService;
        this.statusService = statusService;
        this.currentUser = currentUser;
    }

    @Transactional
    public ReportDtos.DashboardDto dashboard() {
        Long businessId = currentUser.businessId();
        statusService.refreshBusiness(businessId);
        LocalDate today = LocalDate.now();
        LocalDateTime now = LocalDateTime.now();

        List<Invoice> open = invoiceRepository.findOpenInvoices(businessId);
        List<Invoice> overdue = invoiceRepository.findOverdue(businessId, today);
        long totalInvoices = invoiceRepository.countByBusinessId(businessId);
        long paidInvoices = invoiceRepository.countPaidByBusinessId(businessId);

        BigDecimal totalOutstanding = sum(open);
        BigDecimal overdueOutstanding = sum(overdue);
        BigDecimal dueNext7Days = sum(invoiceRepository.findOpenDueBetween(businessId, today, today.plusDays(7)));
        BigDecimal collectedThisMonth = paymentRepository
                .findByBusinessAndDateRange(businessId, today.withDayOfMonth(1), today).stream()
                .map(payment -> payment.getAmount())
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long openTasks = followUpRepository.countByInvoiceBusinessIdAndStatus(businessId, FollowUpStatus.OPEN);
        long missedTasks = followUpRepository.countByInvoiceBusinessIdAndStatusAndDueDateBefore(
                businessId, FollowUpStatus.OPEN, today);
        long remindersThisWeek = reminderRepository.countByInvoiceBusinessIdAndStatusAndScheduledAtBetween(
                businessId, ReminderStatus.SCHEDULED, now, now.plusDays(7));

        List<ReportDtos.StatusCountDto> statusBreakdown = statusBreakdown(businessId, today);
        List<ReportDtos.CustomerExposureDto> topOverdue = overdueByCustomer(overdue, today).stream()
                .limit(5)
                .toList();

        List<PaymentDtos.PaymentDto> recentPayments = paymentRepository
                .findRecentForBusiness(businessId, PageRequest.of(0, 5)).stream()
                .map(paymentService::toDto)
                .toList();

        return new ReportDtos.DashboardDto(
                currentUser.business().getCurrency(),
                today,
                totalOutstanding,
                overdueOutstanding,
                overdue.size(),
                dueNext7Days,
                collectedThisMonth,
                open.size(),
                paidInvoices,
                totalInvoices,
                customerRepository.countByBusinessId(businessId),
                openTasks,
                missedTasks,
                remindersThisWeek,
                ageingBuckets(open, today),
                statusBreakdown,
                topOverdue,
                recentPayments,
                monthlyCollections(businessId, today));
    }

    public List<ReportDtos.AgeingBucketDto> ageingBuckets(List<Invoice> open, LocalDate today) {
        String[] labels = {"Not yet due", "1-30 days", "31-60 days", "61-90 days", "90+ days"};
        long[] counts = new long[5];
        BigDecimal[] amounts = new BigDecimal[5];
        for (int i = 0; i < 5; i++) {
            amounts[i] = BigDecimal.ZERO;
        }
        for (Invoice invoice : open) {
            int index = Ageing.index(invoice, today);
            counts[index]++;
            amounts[index] = amounts[index].add(invoice.outstandingAmount());
        }
        List<ReportDtos.AgeingBucketDto> buckets = new ArrayList<>();
        for (int i = 0; i < labels.length; i++) {
            buckets.add(new ReportDtos.AgeingBucketDto(labels[i], counts[i], amounts[i]));
        }
        return buckets;
    }

    public List<ReportDtos.CustomerExposureDto> overdueByCustomer(List<Invoice> overdue, LocalDate today) {
        Map<Long, List<Invoice>> grouped = overdue.stream()
                .collect(Collectors.groupingBy(invoice -> invoice.getCustomer().getId(), LinkedHashMap::new,
                        Collectors.toList()));
        List<ReportDtos.CustomerExposureDto> rows = new ArrayList<>();
        for (Map.Entry<Long, List<Invoice>> entry : grouped.entrySet()) {
            List<Invoice> invoices = entry.getValue();
            BigDecimal amount = invoices.stream().map(Invoice::outstandingAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            long oldest = invoices.stream()
                    .mapToLong(invoice -> java.time.temporal.ChronoUnit.DAYS.between(invoice.getDueDate(), today))
                    .max().orElse(0);
            rows.add(new ReportDtos.CustomerExposureDto(
                    entry.getKey(),
                    invoices.getFirst().getCustomer().getName(),
                    amount,
                    invoices.size(),
                    oldest));
        }
        rows.sort((a, b) -> b.outstanding().compareTo(a.outstanding()));
        return rows;
    }

    private List<ReportDtos.StatusCountDto> statusBreakdown(Long businessId, LocalDate today) {
        List<Invoice> all = invoiceRepository.search(businessId, null, null, false, today, null);
        Map<InvoiceStatus, long[]> counts = new EnumMap<>(InvoiceStatus.class);
        Map<InvoiceStatus, BigDecimal> amounts = new EnumMap<>(InvoiceStatus.class);
        for (InvoiceStatus status : InvoiceStatus.values()) {
            counts.put(status, new long[]{0});
            amounts.put(status, BigDecimal.ZERO);
        }
        for (Invoice invoice : all) {
            InvoiceStatus status = statusService.compute(invoice, today);
            counts.get(status)[0]++;
            amounts.put(status, amounts.get(status).add(invoice.outstandingAmount()));
        }
        List<ReportDtos.StatusCountDto> result = new ArrayList<>();
        for (InvoiceStatus status : InvoiceStatus.values()) {
            result.add(new ReportDtos.StatusCountDto(status.name(), counts.get(status)[0], amounts.get(status)));
        }
        return result;
    }

    private List<ReportDtos.MonthlyCollectionDto> monthlyCollections(Long businessId, LocalDate today) {
        LocalDate start = today.withDayOfMonth(1).minusMonths(5);
        List<com.collectflow.domain.Payment> payments =
                paymentRepository.findByBusinessAndDateRange(businessId, start, today);
        Map<YearMonth, BigDecimal> totals = new LinkedHashMap<>();
        for (int i = 0; i < 6; i++) {
            totals.put(YearMonth.from(start).plusMonths(i), BigDecimal.ZERO);
        }
        for (com.collectflow.domain.Payment payment : payments) {
            YearMonth month = YearMonth.from(payment.getPaymentDate());
            totals.computeIfPresent(month, (key, value) -> value.add(payment.getAmount()));
        }
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MMM yyyy", Locale.ENGLISH);
        return totals.entrySet().stream()
                .map(entry -> new ReportDtos.MonthlyCollectionDto(entry.getKey().format(formatter), entry.getValue()))
                .toList();
    }

    public static BigDecimal sum(List<Invoice> invoices) {
        return invoices.stream().map(Invoice::outstandingAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /** Shared ageing bucket boundaries used by the dashboard and the ageing report. */
    public static final class Ageing {

        private Ageing() {
        }

        /** 0 = not yet due, 1 = 1-30, 2 = 31-60, 3 = 61-90, 4 = 90+ days overdue. */
        public static int index(Invoice invoice, LocalDate today) {
            if (!invoice.getDueDate().isBefore(today)) {
                return 0;
            }
            long days = java.time.temporal.ChronoUnit.DAYS.between(invoice.getDueDate(), today);
            if (days <= 30) {
                return 1;
            }
            if (days <= 60) {
                return 2;
            }
            if (days <= 90) {
                return 3;
            }
            return 4;
        }
    }
}
