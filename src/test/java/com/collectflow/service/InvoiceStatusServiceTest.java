package com.collectflow.service;

import com.collectflow.domain.Invoice;
import com.collectflow.domain.InvoiceStatus;
import com.collectflow.repo.InvoiceRepository;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class InvoiceStatusServiceTest {

    private final InvoiceStatusService service = new InvoiceStatusService(mock(InvoiceRepository.class));
    private final LocalDate today = LocalDate.of(2026, 10, 24);

    private Invoice invoice(String total, String paid, LocalDate dueDate) {
        Invoice invoice = new Invoice();
        invoice.setTotalAmount(new BigDecimal(total));
        invoice.setAmountPaid(new BigDecimal(paid));
        invoice.setDueDate(dueDate);
        return invoice;
    }

    @Test
    void pendingWhenUnpaidAndNotYetDue() {
        assertThat(service.compute(invoice("1000.00", "0.00", today.plusDays(5)), today))
                .isEqualTo(InvoiceStatus.PENDING);
    }

    @Test
    void overdueWhenUnpaidAndPastDue() {
        assertThat(service.compute(invoice("1000.00", "0.00", today.minusDays(1)), today))
                .isEqualTo(InvoiceStatus.OVERDUE);
    }

    @Test
    void partiallyPaidTakesPrecedenceOverOverdueFlag() {
        Invoice invoice = invoice("1000.00", "250.00", today.minusDays(20));
        assertThat(service.compute(invoice, today)).isEqualTo(InvoiceStatus.PARTIALLY_PAID);
        assertThat(invoice.isOverdue(today)).isTrue();
    }

    @Test
    void paidWhenNothingOutstanding() {
        assertThat(service.compute(invoice("1000.00", "1000.00", today.minusDays(90)), today))
                .isEqualTo(InvoiceStatus.PAID);
    }

    @Test
    void refreshOnlyWritesWhenTheStatusChanged() {
        Invoice invoice = invoice("1000.00", "0.00", today.minusDays(4));
        invoice.setStatus(InvoiceStatus.PENDING);
        assertThat(service.refresh(invoice)).isTrue();
        assertThat(invoice.getStatus()).isEqualTo(InvoiceStatus.OVERDUE);
        assertThat(service.refresh(invoice)).isFalse();
    }
}
