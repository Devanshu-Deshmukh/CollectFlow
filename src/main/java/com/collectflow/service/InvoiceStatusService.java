package com.collectflow.service;

import com.collectflow.domain.Invoice;
import com.collectflow.domain.InvoiceStatus;
import com.collectflow.repo.InvoiceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

/**
 * Invoice status is derived from payments and the due date, then stored so that
 * list filters and reports can use it directly. It is recomputed whenever a payment
 * is recorded and by the daily scheduled job.
 */
@Service
public class InvoiceStatusService {

    private final InvoiceRepository invoiceRepository;

    public InvoiceStatusService(InvoiceRepository invoiceRepository) {
        this.invoiceRepository = invoiceRepository;
    }

    public InvoiceStatus compute(Invoice invoice, LocalDate today) {
        if (invoice.outstandingAmount().signum() == 0) {
            return InvoiceStatus.PAID;
        }
        if (invoice.getAmountPaid().signum() > 0) {
            return InvoiceStatus.PARTIALLY_PAID;
        }
        if (invoice.getDueDate().isBefore(today)) {
            return InvoiceStatus.OVERDUE;
        }
        return InvoiceStatus.PENDING;
    }

    public boolean refresh(Invoice invoice) {
        InvoiceStatus status = compute(invoice, LocalDate.now());
        if (status != invoice.getStatus()) {
            invoice.setStatus(status);
            invoice.setUpdatedAt(java.time.LocalDateTime.now());
            return true;
        }
        return false;
    }

    @Transactional
    public int refreshAll() {
        List<Invoice> open = invoiceRepository.findAllOpen();
        int changed = 0;
        for (Invoice invoice : open) {
            if (refresh(invoice)) {
                changed++;
            }
        }
        return changed;
    }

    @Transactional
    public int refreshBusiness(Long businessId) {
        int changed = 0;
        for (Invoice invoice : invoiceRepository.findOpenInvoices(businessId)) {
            if (refresh(invoice)) {
                changed++;
            }
        }
        return changed;
    }
}
