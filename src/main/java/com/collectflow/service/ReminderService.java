package com.collectflow.service;

import com.collectflow.domain.Invoice;
import com.collectflow.domain.Reminder;
import com.collectflow.domain.ReminderStatus;
import com.collectflow.domain.ReminderTemplate;
import com.collectflow.repo.InvoiceRepository;
import com.collectflow.repo.ReminderRepository;
import com.collectflow.repo.ReminderTemplateRepository;
import com.collectflow.security.CurrentUser;
import com.collectflow.web.ApiException;
import com.collectflow.web.dto.ReminderDtos;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class ReminderService {

    private static final Logger log = LoggerFactory.getLogger(ReminderService.class);

    private final ReminderRepository reminderRepository;
    private final ReminderTemplateRepository templateRepository;
    private final InvoiceRepository invoiceRepository;
    private final ReminderTemplateService templateService;
    private final EmailNotificationService emailService;
    private final CurrentUser currentUser;

    public ReminderService(ReminderRepository reminderRepository,
                           ReminderTemplateRepository templateRepository,
                           InvoiceRepository invoiceRepository,
                           ReminderTemplateService templateService,
                           EmailNotificationService emailService,
                           CurrentUser currentUser) {
        this.reminderRepository = reminderRepository;
        this.templateRepository = templateRepository;
        this.invoiceRepository = invoiceRepository;
        this.templateService = templateService;
        this.emailService = emailService;
        this.currentUser = currentUser;
    }

    /**
     * Creates the reminder rows an invoice needs from the business's active templates.
     * Reminders whose trigger date has already passed are not backfilled: they would
     * otherwise all fire at once for a newly imported overdue invoice.
     */
    @Transactional
    public int scheduleForInvoice(Invoice invoice) {
        if (invoice.outstandingAmount().signum() == 0) {
            return 0;
        }
        List<ReminderTemplate> templates =
                templateRepository.findByBusinessIdAndActiveTrueOrderByOffsetDaysAsc(invoice.getBusiness().getId());
        String businessName = invoice.getBusiness().getName();
        LocalDate today = LocalDate.now();
        int created = 0;
        for (ReminderTemplate template : templates) {
            LocalDateTime scheduledAt = template.scheduledFor(invoice.getDueDate());
            if (scheduledAt.toLocalDate().isBefore(today)) {
                continue;
            }
            if (reminderRepository.existsByInvoiceIdAndTemplateId(invoice.getId(), template.getId())) {
                continue;
            }
            Reminder reminder = new Reminder();
            reminder.setInvoice(invoice);
            reminder.setTemplate(template);
            reminder.setScheduledAt(scheduledAt);
            reminder.setStatus(ReminderStatus.SCHEDULED);
            reminder.setRecipientEmail(invoice.getCustomer().getEmail());
            var variables = TemplateRenderer.variables(invoice, businessName, scheduledAt.toLocalDate());
            reminder.setSubject(TemplateRenderer.render(template.getSubject(), variables));
            reminder.setBody(TemplateRenderer.render(template.getBody(), variables));
            reminder.setCreatedAt(LocalDateTime.now());
            reminderRepository.save(reminder);
            created++;
        }
        return created;
    }

    @Transactional
    public int scheduleForBusiness(Long businessId) {
        int created = 0;
        for (Invoice invoice : invoiceRepository.findOpenInvoices(businessId)) {
            created += scheduleForInvoice(invoice);
        }
        return created;
    }

    /** Sends every scheduled reminder that is due, for all businesses. Used by the daily job. */
    @Transactional
    public int dispatchDue() {
        return dispatch(reminderRepository.findDue(ReminderStatus.SCHEDULED, LocalDateTime.now()));
    }

    @Transactional
    public int dispatchDueForBusiness(Long businessId) {
        List<Reminder> due = reminderRepository
                .findByBusinessAndStatusDue(businessId, ReminderStatus.SCHEDULED, LocalDateTime.now());
        return dispatch(due);
    }

    private int dispatch(List<Reminder> due) {
        int sent = 0;
        for (Reminder reminder : due) {
            Invoice invoice = reminder.getInvoice();
            if (invoice.outstandingAmount().signum() == 0) {
                reminder.setStatus(ReminderStatus.CANCELLED);
                reminder.setNote("Invoice was settled before this reminder was sent");
                reminderRepository.save(reminder);
                continue;
            }
            var delivery = emailService.send(reminder.getRecipientEmail(), reminder.getSubject(), reminder.getBody());
            reminder.setSentAt(LocalDateTime.now());
            reminder.setStatus(delivery.delivered() ? ReminderStatus.SENT : ReminderStatus.FAILED);
            reminder.setNote(delivery.note());
            reminderRepository.save(reminder);
            if (delivery.delivered()) {
                sent++;
            }
            log.info("Reminder {} for invoice {} -> {}", reminder.getId(),
                    invoice.getInvoiceNumber(), delivery.delivered() ? "sent" : "failed");
        }
        return sent;
    }

    @Transactional
    public ReminderDtos.ReminderDto sendManual(Long invoiceId, Long templateId) {
        Invoice invoice = invoiceRepository.findDetailed(invoiceId, currentUser.businessId())
                .orElseThrow(() -> ApiException.notFound("Invoice not found"));
        if (invoice.outstandingAmount().signum() == 0) {
            throw ApiException.badRequest("This invoice has no outstanding balance");
        }
        ReminderTemplate template = null;
        String subject;
        String body;
        var variables = TemplateRenderer.variables(invoice, invoice.getBusiness().getName(), LocalDate.now());
        if (templateId != null) {
            template = templateService.findOwned(templateId);
            subject = TemplateRenderer.render(template.getSubject(), variables);
            body = TemplateRenderer.render(template.getBody(), variables);
        } else {
            subject = "Payment reminder: invoice " + invoice.getInvoiceNumber();
            body = TemplateRenderer.render("""
                    Hello {{customerName}},

                    Invoice {{invoiceNumber}} for {{amount}} is due on {{dueDate}}. Please let us know when we can expect payment.

                    Thank you,
                    {{businessName}}""", variables);
        }

        Reminder reminder = new Reminder();
        reminder.setInvoice(invoice);
        reminder.setTemplate(template);
        reminder.setScheduledAt(LocalDateTime.now());
        reminder.setRecipientEmail(invoice.getCustomer().getEmail());
        reminder.setSubject(subject);
        reminder.setBody(body);
        reminder.setCreatedAt(LocalDateTime.now());
        reminder.setStatus(ReminderStatus.SCHEDULED);

        var delivery = emailService.send(reminder.getRecipientEmail(), subject, body);
        reminder.setSentAt(LocalDateTime.now());
        reminder.setStatus(delivery.delivered() ? ReminderStatus.SENT : ReminderStatus.FAILED);
        reminder.setNote(delivery.note());
        return toDto(reminderRepository.save(reminder));
    }

    @Transactional
    public void cancelScheduled(Long invoiceId, String note) {
        for (Reminder reminder : reminderRepository.findByInvoiceIdOrderByScheduledAtAsc(invoiceId)) {
            if (reminder.getStatus() == ReminderStatus.SCHEDULED) {
                reminder.setStatus(ReminderStatus.CANCELLED);
                reminder.setNote(note);
                reminderRepository.save(reminder);
            }
        }
    }

    @Transactional(readOnly = true)
    public List<ReminderDtos.ReminderDto> listForInvoice(Long invoiceId) {
        Invoice invoice = invoiceRepository.findDetailed(invoiceId, currentUser.businessId())
                .orElseThrow(() -> ApiException.notFound("Invoice not found"));
        return reminderRepository.findByInvoiceIdOrderByScheduledAtAsc(invoice.getId()).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ReminderDtos.ReminderDto> listForBusiness() {
        return reminderRepository.findForBusiness(currentUser.businessId()).stream()
                .map(this::toDto)
                .toList();
    }

    public ReminderDtos.ReminderDto toDto(Reminder reminder) {
        Invoice invoice = reminder.getInvoice();
        return new ReminderDtos.ReminderDto(
                reminder.getId(),
                invoice.getId(),
                invoice.getInvoiceNumber(),
                invoice.getCustomer().getId(),
                invoice.getCustomer().getName(),
                reminder.getRecipientEmail(),
                reminder.getScheduledAt(),
                reminder.getSentAt(),
                reminder.getStatus().name(),
                reminder.getSubject(),
                reminder.getBody(),
                reminder.getNote(),
                reminder.getTemplate() == null ? null : reminder.getTemplate().getId(),
                reminder.getTemplate() == null ? null : reminder.getTemplate().getName());
    }
}
