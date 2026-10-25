package com.collectflow.service;

import com.collectflow.config.AppProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailNotificationService {

    private static final Logger log = LoggerFactory.getLogger(EmailNotificationService.class);

    public record Delivery(boolean delivered, String note) {
    }

    private final JavaMailSender mailSender;
    private final AppProperties properties;

    public EmailNotificationService(JavaMailSender mailSender, AppProperties properties) {
        this.mailSender = mailSender;
        this.properties = properties;
    }

    public Delivery send(String to, String subject, String body) {
        if (to == null || to.isBlank()) {
            return new Delivery(false, "Customer has no email address on file");
        }
        if (!properties.getNotifications().isEmailEnabled()) {
            log.info("Email delivery disabled. Reminder for {} would be sent:\nSubject: {}\n{}", to, subject, body);
            return new Delivery(true, "Email delivery disabled - reminder logged only");
        }
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(properties.getNotifications().getFrom());
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
            return new Delivery(true, null);
        } catch (MailException ex) {
            log.warn("Failed to send reminder email to {}: {}", to, ex.getMessage());
            return new Delivery(false, "Email could not be sent: " + ex.getMessage());
        }
    }
}
