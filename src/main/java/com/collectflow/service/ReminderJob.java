package com.collectflow.service;

import com.collectflow.domain.Business;
import com.collectflow.repo.BusinessRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class ReminderJob {

    private static final Logger log = LoggerFactory.getLogger(ReminderJob.class);

    private final BusinessRepository businessRepository;
    private final InvoiceStatusService statusService;
    private final ReminderService reminderService;

    public ReminderJob(BusinessRepository businessRepository,
                       InvoiceStatusService statusService,
                       ReminderService reminderService) {
        this.businessRepository = businessRepository;
        this.statusService = statusService;
        this.reminderService = reminderService;
    }

    /** Runs on the cron in app.reminders.cron (08:00 daily by default). */
    @Scheduled(cron = "${app.reminders.cron}")
    public void runDaily() {
        log.info("Starting daily receivables job");
        int changed = statusService.refreshAll();
        int scheduled = 0;
        int sent = 0;
        for (Business business : businessRepository.findAll()) {
            try {
                scheduled += reminderService.scheduleForBusiness(business.getId());
            } catch (RuntimeException ex) {
                log.warn("Could not schedule reminders for business {}: {}", business.getId(), ex.getMessage());
            }
        }
        try {
            sent = reminderService.dispatchDue();
        } catch (RuntimeException ex) {
            log.warn("Reminder dispatch failed: {}", ex.getMessage());
        }
        log.info("Daily receivables job finished: {} statuses updated, {} reminders scheduled, {} reminders sent",
                changed, scheduled, sent);
    }
}
