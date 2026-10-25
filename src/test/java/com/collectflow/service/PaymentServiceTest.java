package com.collectflow.service;

import com.collectflow.domain.Business;
import com.collectflow.domain.Customer;
import com.collectflow.domain.Invoice;
import com.collectflow.domain.InvoiceStatus;
import com.collectflow.domain.Payment;
import com.collectflow.domain.User;
import com.collectflow.repo.InvoiceRepository;
import com.collectflow.repo.PaymentRepository;
import com.collectflow.security.CurrentUser;
import com.collectflow.web.ApiException;
import com.collectflow.web.dto.PaymentDtos;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

    @Mock private PaymentRepository paymentRepository;
    @Mock private InvoiceRepository invoiceRepository;
    @Mock private ReminderService reminderService;
    @Mock private CurrentUser currentUser;

    private PaymentService paymentService;
    private Invoice invoice;

    @BeforeEach
    void setUp() {
        paymentService = new PaymentService(paymentRepository, invoiceRepository,
                new InvoiceStatusService(invoiceRepository), reminderService, currentUser);

        Business business = new Business();
        business.setId(1L);
        Customer customer = new Customer();
        customer.setId(2L);
        customer.setName("Kavya Textiles");

        invoice = new Invoice();
        invoice.setId(5L);
        invoice.setBusiness(business);
        invoice.setCustomer(customer);
        invoice.setInvoiceNumber("INV-2026-0002");
        invoice.setCurrency("INR");
        invoice.setTotalAmount(new BigDecimal("1000.00"));
        invoice.setAmountPaid(BigDecimal.ZERO);
        invoice.setDueDate(LocalDate.now().minusDays(10));
        invoice.setStatus(InvoiceStatus.OVERDUE);
    }

    private PaymentDtos.PaymentRequest request(String amount) {
        return new PaymentDtos.PaymentRequest(new BigDecimal(amount), LocalDate.now(),
                "BANK_TRANSFER", "UTR123", null);
    }

    @Test
    void rejectsPaymentAboveOutstandingBalance() {
        when(currentUser.businessId()).thenReturn(1L);
        when(invoiceRepository.findDetailed(5L, 1L)).thenReturn(Optional.of(invoice));

        assertThatThrownBy(() -> paymentService.record(5L, request("1000.01")))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("exceeds the outstanding balance");
        verifyNoInteractions(paymentRepository);
    }

    @Test
    void recordsPartialPaymentAndUpdatesStatus() {
        User user = new User("Ananya Rao", "demo@collectflow.app", "hash");
        when(currentUser.businessId()).thenReturn(1L);
        when(currentUser.user()).thenReturn(user);
        when(invoiceRepository.findDetailed(5L, 1L)).thenReturn(Optional.of(invoice));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> {
            Payment payment = invocation.getArgument(0);
            payment.setId(77L);
            return payment;
        });

        PaymentDtos.PaymentDto result = paymentService.record(5L, request("400.00"));

        assertThat(result.amount()).isEqualByComparingTo("400.00");
        assertThat(invoice.getAmountPaid()).isEqualByComparingTo("400.00");
        assertThat(invoice.getStatus()).isEqualTo(InvoiceStatus.PARTIALLY_PAID);
        verify(reminderService, never()).cancelScheduled(anyLong(), anyString());
        verify(invoiceRepository).save(invoice);
    }

    @Test
    void settlingInvoiceCancelsRemainingScheduledReminders() {
        User user = new User("Ananya Rao", "demo@collectflow.app", "hash");
        when(currentUser.businessId()).thenReturn(1L);
        when(currentUser.user()).thenReturn(user);
        when(invoiceRepository.findDetailed(5L, 1L)).thenReturn(Optional.of(invoice));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        paymentService.record(5L, request("1000.00"));

        assertThat(invoice.outstandingAmount()).isEqualByComparingTo("0.00");
        assertThat(invoice.getStatus()).isEqualTo(InvoiceStatus.PAID);
        verify(reminderService).cancelScheduled(eq(5L), anyString());
    }
}
