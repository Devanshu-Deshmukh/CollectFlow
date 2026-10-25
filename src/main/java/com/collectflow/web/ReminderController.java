package com.collectflow.web;

import com.collectflow.security.CurrentUser;
import com.collectflow.service.ReminderService;
import com.collectflow.service.ReminderTemplateService;
import com.collectflow.web.dto.ReminderDtos;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
public class ReminderController {

    private final ReminderService reminderService;
    private final ReminderTemplateService templateService;
    private final CurrentUser currentUser;

    public ReminderController(ReminderService reminderService,
                              ReminderTemplateService templateService,
                              CurrentUser currentUser) {
        this.reminderService = reminderService;
        this.templateService = templateService;
        this.currentUser = currentUser;
    }

    @GetMapping("/api/reminders")
    public List<ReminderDtos.ReminderDto> list() {
        return reminderService.listForBusiness();
    }

    @PostMapping("/api/reminders/process")
    public Map<String, Object> processDue() {
        int sent = reminderService.dispatchDueForBusiness(currentUser.businessId());
        int scheduled = reminderService.scheduleForBusiness(currentUser.businessId());
        return Map.of("remindersSent", sent, "remindersScheduled", scheduled);
    }

    @GetMapping("/api/invoices/{invoiceId}/reminders")
    public List<ReminderDtos.ReminderDto> forInvoice(@PathVariable Long invoiceId) {
        return reminderService.listForInvoice(invoiceId);
    }

    @PostMapping("/api/invoices/{invoiceId}/reminders")
    @ResponseStatus(HttpStatus.CREATED)
    public ReminderDtos.ReminderDto sendNow(@PathVariable Long invoiceId,
                                            @RequestBody(required = false) ReminderDtos.SendReminderRequest request) {
        return reminderService.sendManual(invoiceId, request == null ? null : request.templateId());
    }

    @GetMapping("/api/reminder-templates")
    public List<ReminderDtos.TemplateDto> templates() {
        return templateService.list();
    }

    @PostMapping("/api/reminder-templates")
    @ResponseStatus(HttpStatus.CREATED)
    public ReminderDtos.TemplateDto createTemplate(@Valid @RequestBody ReminderDtos.TemplateRequest request) {
        return templateService.create(request);
    }

    @PutMapping("/api/reminder-templates/{id}")
    public ReminderDtos.TemplateDto updateTemplate(@PathVariable Long id,
                                                   @Valid @RequestBody ReminderDtos.TemplateRequest request) {
        return templateService.update(id, request);
    }

    @DeleteMapping("/api/reminder-templates/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTemplate(@PathVariable Long id) {
        templateService.delete(id);
    }
}
