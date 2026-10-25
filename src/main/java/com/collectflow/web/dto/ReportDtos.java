package com.collectflow.web.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public final class ReportDtos {

    private ReportDtos() {
    }

    public record DashboardDto(
            String currency,
            LocalDate asOf,
            BigDecimal totalOutstanding,
            BigDecimal overdueOutstanding,
            long overdueCount,
            BigDecimal dueNext7Days,
            BigDecimal collectedThisMonth,
            long openInvoiceCount,
            long paidInvoiceCount,
            long totalInvoiceCount,
            long customerCount,
            long openTaskCount,
            long missedTaskCount,
            long remindersDueThisWeek,
            List<AgeingBucketDto> ageing,
            List<StatusCountDto> statusBreakdown,
            List<CustomerExposureDto> topOverdueCustomers,
            List<PaymentDtos.PaymentDto> recentPayments,
            List<MonthlyCollectionDto> monthlyCollections) {
    }

    public record AgeingBucketDto(String label, long invoiceCount, BigDecimal outstanding) {
    }

    public record StatusCountDto(String status, long count, BigDecimal outstanding) {
    }

    public record CustomerExposureDto(
            Long customerId,
            String customerName,
            BigDecimal outstanding,
            long invoiceCount,
            long oldestDaysOverdue) {
    }

    public record MonthlyCollectionDto(String month, BigDecimal collected) {
    }

    public record AgeingRowDto(
            Long customerId,
            String customerName,
            BigDecimal notYetDue,
            BigDecimal days1To30,
            BigDecimal days31To60,
            BigDecimal days61To90,
            BigDecimal days90Plus,
            BigDecimal total) {
    }

    public record AgeingReportDto(
            LocalDate asOf,
            List<AgeingBucketDto> summary,
            List<AgeingRowDto> rows,
            BigDecimal totalOutstanding) {
    }

    public record OverdueRowDto(
            Long customerId,
            String customerName,
            BigDecimal overdueAmount,
            long invoiceCount,
            long oldestDaysOverdue) {
    }

    public record OverdueReportDto(
            LocalDate asOf,
            BigDecimal totalOverdue,
            long invoiceCount,
            List<InvoiceDtos.InvoiceSummaryDto> invoices,
            List<OverdueRowDto> byCustomer) {
    }

    public record ExpectedWindowDto(
            String label,
            LocalDate from,
            LocalDate to,
            long invoiceCount,
            BigDecimal amount) {
    }

    public record ExpectedCollectionsDto(
            LocalDate asOf,
            BigDecimal totalExpected,
            String currency,
            List<ExpectedWindowDto> windows,
            List<CustomerExposureDto> largestExposures) {
    }

    public record ImportResultDto(int imported, int skipped, List<String> errors) {
    }
}
