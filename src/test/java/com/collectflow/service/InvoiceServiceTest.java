package com.collectflow.service;

import com.collectflow.domain.Business;
import com.collectflow.domain.Customer;
import com.collectflow.domain.Invoice;
import com.collectflow.domain.InvoiceStatus;
import com.collectflow.repo.CustomerRepository;
import com.collectflow.repo.FollowUpRepository;
import com.collectflow.repo.InvoiceRepository;
import com.collectflow.repo.ReminderRepository;
import com.collectflow.security.CurrentUser;
import com.collectflow.web.ApiException;
import com.collectflow.web.dto.InvoiceDtos;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InvoiceServiceTest {

    @Mock private InvoiceRepository invoiceRepository;
    @Mock private CustomerRepository customerRepository;
    @Mock private FollowUpRepository followUpRepository;
    @Mock private ReminderRepository reminderRepository;
    @Mock private InvoiceStatusService statusService;
    @Mock private ReminderService reminderService;
    @Mock private CurrentUser currentUser;

    private InvoiceService invoiceService;
    private Business business;
    private Customer customer;

    @BeforeEach
    void setUp() {
        business = new Business();
        business.setId(1L);
        business.setName("Meridian Design Studio");
        business.setCurrency("INR");

        customer = new Customer();
        customer.setId(7L);
        customer.setName("Northstar Logistics");
        customer.setBusiness(business);

        invoiceService = new InvoiceService(invoiceRepository, customerRepository, followUpRepository,
                reminderRepository, statusService, reminderService, currentUser);
    }

    private InvoiceDtos.InvoiceRequest request(List<InvoiceDtos.InvoiceLineRequest> lines) {
        return new InvoiceDtos.InvoiceRequest(7L, null, LocalDate.of(2026, 10, 1),
                LocalDate.of(2026, 10, 31), "October retainer", lines);
    }

    @Test
    void createsInvoiceWithTotalsFromLinesAndSchedulesReminders() {
        when(currentUser.businessId()).thenReturn(1L);
        when(currentUser.business()).thenReturn(business);
        when(customerRepository.findByIdAndBusinessId(7L, 1L)).thenReturn(Optional.of(customer));
        when(invoiceRepository.findAllInvoiceNumbers(1L)).thenReturn(List.of("INV-2026-0003"));
        when(invoiceRepository.existsByBusinessIdAndInvoiceNumber(eq(1L), anyString())).thenReturn(false);

        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(invocation -> {
            Invoice invoice = invocation.getArgument(0);
            if (invoice.getId() == null) {
                invoice.setId(99L);
            }
            return invoice;
        });
        when(statusService.compute(any(Invoice.class), any(LocalDate.class))).thenReturn(InvoiceStatus.PENDING);
        when(followUpRepository.countByInvoiceId(99L)).thenReturn(0L);
        when(reminderRepository.countByInvoiceId(99L)).thenReturn(3L);

        InvoiceDtos.InvoiceDto created = invoiceService.create(request(List.of(
                new InvoiceDtos.InvoiceLineRequest("Design work", new BigDecimal("2"), new BigDecimal("15000.50")),
                new InvoiceDtos.InvoiceLineRequest("Photography", new BigDecimal("3"), new BigDecimal("2500.25")))));

        assertThat(created.invoiceNumber()).isEqualTo("INV-2026-0004");
        assertThat(created.totalAmount()).isEqualByComparingTo("37501.75");
        assertThat(created.outstandingAmount()).isEqualByComparingTo("37501.75");
        assertThat(created.lines()).hasSize(2);
        assertThat(created.lines().getFirst().amount()).isEqualByComparingTo("30001.00");
        assertThat(created.status()).isEqualTo("PENDING");
        assertThat(created.reminderCount()).isEqualTo(3);

        ArgumentCaptor<Invoice> captor = ArgumentCaptor.forClass(Invoice.class);
        verify(invoiceRepository, org.mockito.Mockito.atLeastOnce()).save(captor.capture());
        assertThat(captor.getAllValues().getFirst().getCustomer().getName()).isEqualTo("Northstar Logistics");
        verify(reminderService).scheduleForInvoice(any(Invoice.class));
    }

    @Test
    void rejectsDueDateBeforeIssueDate() {
        when(currentUser.businessId()).thenReturn(1L);
        when(customerRepository.findByIdAndBusinessId(7L, 1L)).thenReturn(Optional.of(customer));

        InvoiceDtos.InvoiceRequest badRequest = new InvoiceDtos.InvoiceRequest(7L, null,
                LocalDate.of(2026, 10, 20), LocalDate.of(2026, 10, 1), null,
                List.of(new InvoiceDtos.InvoiceLineRequest("Work", BigDecimal.ONE, BigDecimal.TEN)));

        assertThatThrownBy(() -> invoiceService.create(badRequest))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("Due date cannot be before the issue date");
    }

    @Test
    void rejectsDuplicateInvoiceNumber() {
        when(currentUser.businessId()).thenReturn(1L);
        when(customerRepository.findByIdAndBusinessId(7L, 1L)).thenReturn(Optional.of(customer));
        when(invoiceRepository.existsByBusinessIdAndInvoiceNumber(1L, "INV-2026-0001")).thenReturn(true);

        InvoiceDtos.InvoiceRequest duplicate = new InvoiceDtos.InvoiceRequest(7L, "INV-2026-0001",
                LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 31), null,
                List.of(new InvoiceDtos.InvoiceLineRequest("Work", BigDecimal.ONE, BigDecimal.TEN)));

        assertThatThrownBy(() -> invoiceService.create(duplicate))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("already exists");
    }

    @Test
    void generatesNextNumberFromExistingInvoices() {
        when(currentUser.businessId()).thenReturn(1L);
        when(invoiceRepository.findAllInvoiceNumbers(1L))
                .thenReturn(List.of("INV-2026-0001", "INV-2026-0007", "CUSTOM-REF", "INV-2025-0042"));
        when(invoiceRepository.existsByBusinessIdAndInvoiceNumber(1L, "INV-2026-0008")).thenReturn(false);

        assertThat(invoiceService.nextInvoiceNumber(2026)).isEqualTo("INV-2026-0008");
    }
}
