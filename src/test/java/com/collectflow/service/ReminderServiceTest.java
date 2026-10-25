package com.collectflow.service;

import com.collectflow.domain.Business;
import com.collectflow.domain.Customer;
import com.collectflow.domain.Invoice;
import com.collectflow.domain.Reminder;
import com.collectflow.domain.ReminderStatus;
import com.collectflow.domain.ReminderTemplate;
import com.collectflow.domain.ReminderTrigger;
import com.collectflow.repo.InvoiceRepository;
import com.collectflow.repo.ReminderRepository;
import com.collectflow.repo.ReminderTemplateRepository;
import com.collectflow.security.CurrentUser;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReminderServiceTest {

    @Mock private ReminderRepository reminderRepository;
    @Mock private ReminderTemplateRepository templateRepository;
    @Mock private InvoiceRepository invoiceRepository;
    @Mock private ReminderTemplateService templateService;
    @Mock private EmailNotificationService emailService;
    @Mock private CurrentUser currentUser;

    private ReminderService reminderService;
    private Invoice invoice;
    private Business business;

    @BeforeEach
    void setUp() {
        reminderService = new ReminderService(reminderRepository, templateRepository, invoiceRepository,
                templateService, emailService, currentUser);

        business = new Business();
        business.setId(1L);
        business.setName("Meridian Design Studio");

        Customer customer = new Customer();
        customer.setId(4L);
        customer.setName("Sundara Foods");
        customer.setEmail("finance@sundarafoods.in");

        invoice = new Invoice();
        invoice.setId(8L);
        invoice.setBusiness(business);
        invoice.setCustomer(customer);
        invoice.setInvoiceNumber("INV-2026-0008");
        invoice.setCurrency("INR");
        invoice.setIssueDate(LocalDate.now().minusDays(20));
        invoice.setDueDate(LocalDate.now().plusDays(10));
        invoice.setTotalAmount(new BigDecimal("50000.00"));
        invoice.setAmountPaid(BigDecimal.ZERO);
    }

    private ReminderTemplate template(long id, ReminderTrigger trigger, int offsetDays) {
        ReminderTemplate template = new ReminderTemplate();
        template.setId(id);
        template.setBusiness(business);
        template.setName("Template " + id);
        template.setTriggerType(trigger);
        template.setOffsetDays(offsetDays);
        template.setSubject("Invoice {{invoiceNumber}} due {{dueDate}}");
        template.setBody("Hi {{customerName}}, {{amount}} is due for invoice {{invoiceNumber}}.");
        template.setActive(true);
        return template;
    }

    @Test
    void schedulesOnlyFutureRemindersAndRendersTheTemplate() {
        ReminderTemplate upcoming = template(1L, ReminderTrigger.BEFORE_DUE, 3);
        ReminderTemplate longPast = template(2L, ReminderTrigger.BEFORE_DUE, 30);
        when(templateRepository.findByBusinessIdAndActiveTrueOrderByOffsetDaysAsc(1L))
                .thenReturn(List.of(upcoming, longPast));
        when(reminderRepository.existsByInvoiceIdAndTemplateId(anyLong(), anyLong())).thenReturn(false);
        when(reminderRepository.save(any(Reminder.class))).thenAnswer(invocation -> invocation.getArgument(0));

        int created = reminderService.scheduleForInvoice(invoice);

        assertThat(created).isEqualTo(1);
        ArgumentCaptor<Reminder> captor = ArgumentCaptor.forClass(Reminder.class);
        verify(reminderRepository).save(captor.capture());
        Reminder reminder = captor.getValue();
        assertThat(reminder.getTemplate().getId()).isEqualTo(1L);
        assertThat(reminder.getScheduledAt().toLocalDate())
                .isEqualTo(invoice.getDueDate().minusDays(3));
        assertThat(reminder.getStatus()).isEqualTo(ReminderStatus.SCHEDULED);
        assertThat(reminder.getRecipientEmail()).isEqualTo("finance@sundarafoods.in");
        assertThat(reminder.getSubject()).contains("INV-2026-0008");
        assertThat(reminder.getBody())
                .contains("Sundara Foods")
                .contains("50,000.00");
    }

    @Test
    void doesNotScheduleForSettledInvoice() {
        invoice.setAmountPaid(new BigDecimal("50000.00"));
        assertThat(reminderService.scheduleForInvoice(invoice)).isZero();
        verify(reminderRepository, never()).save(any());
    }

    @Test
    void sendsDueReminderForOutstandingInvoice() {
        Reminder reminder = new Reminder();
        reminder.setInvoice(invoice);
        reminder.setStatus(ReminderStatus.SCHEDULED);
        reminder.setScheduledAt(java.time.LocalDateTime.now().minusDays(1));
        reminder.setRecipientEmail("finance@sundarafoods.in");
        reminder.setSubject("Invoice due");
        reminder.setBody("Please pay");

        when(reminderRepository.findDue(any(), any())).thenReturn(List.of(reminder));
        when(emailService.send(anyString(), anyString(), anyString()))
                .thenReturn(new EmailNotificationService.Delivery(true, null));
        when(reminderRepository.save(any(Reminder.class))).thenAnswer(invocation -> invocation.getArgument(0));

        int sent = reminderService.dispatchDue();

        assertThat(sent).isEqualTo(1);
        assertThat(reminder.getStatus()).isEqualTo(ReminderStatus.SENT);
        assertThat(reminder.getSentAt()).isNotNull();
    }

    @Test
    void cancelsReminderInsteadOfChasingSettledInvoice() {
        invoice.setAmountPaid(new BigDecimal("50000.00"));
        Reminder reminder = new Reminder();
        reminder.setInvoice(invoice);
        reminder.setStatus(ReminderStatus.SCHEDULED);
        reminder.setScheduledAt(java.time.LocalDateTime.now().minusDays(1));
        reminder.setRecipientEmail("finance@sundarafoods.in");
        reminder.setSubject("Invoice due");
        reminder.setBody("Please pay");

        when(reminderRepository.findDue(any(), any())).thenReturn(List.of(reminder));
        when(reminderRepository.save(any(Reminder.class))).thenAnswer(invocation -> invocation.getArgument(0));

        assertThat(reminderService.dispatchDue()).isZero();
        assertThat(reminder.getStatus()).isEqualTo(ReminderStatus.CANCELLED);
        verify(emailService, never()).send(anyString(), anyString(), anyString());
    }

    @Test
    void stopsFutureRemindersWhenInvoiceIsPaid() {
        Reminder scheduled = new Reminder();
        scheduled.setInvoice(invoice);
        scheduled.setStatus(ReminderStatus.SCHEDULED);
        when(reminderRepository.findByInvoiceIdOrderByScheduledAtAsc(8L)).thenReturn(List.of(scheduled));
        when(reminderRepository.save(any(Reminder.class))).thenAnswer(invocation -> invocation.getArgument(0));

        reminderService.cancelScheduled(8L, "Invoice was fully paid");

        assertThat(scheduled.getStatus()).isEqualTo(ReminderStatus.CANCELLED);
        assertThat(scheduled.getNote()).isEqualTo("Invoice was fully paid");
    }
}
