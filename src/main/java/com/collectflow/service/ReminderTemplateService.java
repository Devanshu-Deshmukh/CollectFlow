package com.collectflow.service;

import com.collectflow.domain.Business;
import com.collectflow.domain.ReminderTemplate;
import com.collectflow.domain.ReminderTrigger;
import com.collectflow.repo.ReminderTemplateRepository;
import com.collectflow.security.CurrentUser;
import com.collectflow.web.ApiException;
import com.collectflow.web.dto.ReminderDtos;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ReminderTemplateService {

    private final ReminderTemplateRepository repository;
    private final CurrentUser currentUser;

    public ReminderTemplateService(ReminderTemplateRepository repository, CurrentUser currentUser) {
        this.repository = repository;
        this.currentUser = currentUser;
    }

    /** Creates the three standard reminders the first time a business is set up. */
    @Transactional
    public void seedDefaults(Business business) {
        if (repository.existsByBusinessIdAndActiveTrue(business.getId())) {
            return;
        }
        create(business, "Upcoming due date", ReminderTrigger.BEFORE_DUE, 3,
                "Invoice {{invoiceNumber}} is due on {{dueDate}}",
                """
                        Hello {{customerName}},

                        This is a friendly reminder that invoice {{invoiceNumber}} for {{amount}} is due on {{dueDate}}.

                        If payment is already on its way, please ignore this message. Otherwise, we would appreciate it if you could arrange payment by the due date.

                        Thank you,
                        {{businessName}}""");
        create(business, "Due today", ReminderTrigger.ON_DUE, 0,
                "Invoice {{invoiceNumber}} is due today",
                """
                        Hello {{customerName}},

                        Invoice {{invoiceNumber}} for {{amount}} is due today ({{dueDate}}).

                        Please let us know if you need a copy of the invoice or have any questions about it.

                        Thank you,
                        {{businessName}}""");
        create(business, "Overdue follow-up", ReminderTrigger.AFTER_DUE, 7,
                "Payment reminder: invoice {{invoiceNumber}} is {{daysOverdue}} days overdue",
                """
                        Hello {{customerName}},

                        Invoice {{invoiceNumber}} for {{amount}} was due on {{dueDate}} and is now {{daysOverdue}} days overdue.

                        Could you let us know when we can expect payment? If something is holding it up, we are happy to help sort it out.

                        Thank you,
                        {{businessName}}""");
    }

    private void create(Business business, String name, ReminderTrigger trigger, int offset,
                        String subject, String body) {
        ReminderTemplate template = new ReminderTemplate();
        template.setBusiness(business);
        template.setName(name);
        template.setTriggerType(trigger);
        template.setOffsetDays(offset);
        template.setSubject(subject);
        template.setBody(body);
        template.setActive(true);
        template.setCreatedAt(LocalDateTime.now());
        repository.save(template);
    }

    @Transactional(readOnly = true)
    public List<ReminderDtos.TemplateDto> list() {
        return repository.findByBusinessIdOrderByIdAsc(currentUser.businessId()).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public ReminderDtos.TemplateDto get(Long id) {
        return toDto(findOwned(id));
    }

    @Transactional
    public ReminderDtos.TemplateDto create(ReminderDtos.TemplateRequest request) {
        ReminderTemplate template = new ReminderTemplate();
        template.setBusiness(currentUser.business());
        apply(template, request);
        template.setCreatedAt(LocalDateTime.now());
        return toDto(repository.save(template));
    }

    @Transactional
    public ReminderDtos.TemplateDto update(Long id, ReminderDtos.TemplateRequest request) {
        ReminderTemplate template = findOwned(id);
        apply(template, request);
        return toDto(repository.save(template));
    }

    @Transactional
    public void delete(Long id) {
        ReminderTemplate template = findOwned(id);
        repository.delete(template);
    }

    public ReminderTemplate findOwned(Long id) {
        return repository.findByIdAndBusinessId(id, currentUser.businessId())
                .orElseThrow(() -> ApiException.notFound("Reminder template not found"));
    }

    private void apply(ReminderTemplate template, ReminderDtos.TemplateRequest request) {
        template.setName(request.name().trim());
        template.setTriggerType(request.triggerType());
        template.setOffsetDays(request.offsetDays());
        template.setSubject(request.subject());
        template.setBody(request.body());
        template.setActive(request.active());
    }

    public ReminderDtos.TemplateDto toDto(ReminderTemplate template) {
        return new ReminderDtos.TemplateDto(
                template.getId(),
                template.getName(),
                template.getTriggerType(),
                template.getOffsetDays(),
                template.getSubject(),
                template.getBody(),
                template.isActive());
    }
}
