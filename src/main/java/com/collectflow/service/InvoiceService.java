package com.collectflow.service;

import com.collectflow.domain.Customer;
import com.collectflow.domain.Invoice;
import com.collectflow.domain.InvoiceLine;
import com.collectflow.domain.InvoiceStatus;
import com.collectflow.repo.CustomerRepository;
import com.collectflow.repo.FollowUpRepository;
import com.collectflow.repo.InvoiceRepository;
import com.collectflow.repo.ReminderRepository;
import com.collectflow.security.CurrentUser;
import com.collectflow.web.ApiException;
import com.collectflow.web.dto.InvoiceDtos;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
public class InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final CustomerRepository customerRepository;
    private final FollowUpRepository followUpRepository;
    private final ReminderRepository reminderRepository;
    private final InvoiceStatusService statusService;
    private final ReminderService reminderService;
    private final CurrentUser currentUser;

    public InvoiceService(InvoiceRepository invoiceRepository,
                          CustomerRepository customerRepository,
                          FollowUpRepository followUpRepository,
                          ReminderRepository reminderRepository,
                          InvoiceStatusService statusService,
                          ReminderService reminderService,
                          CurrentUser currentUser) {
        this.invoiceRepository = invoiceRepository;
        this.customerRepository = customerRepository;
        this.followUpRepository = followUpRepository;
        this.reminderRepository = reminderRepository;
        this.statusService = statusService;
        this.reminderService = reminderService;
        this.currentUser = currentUser;
    }

    @Transactional
    public List<InvoiceDtos.InvoiceSummaryDto> list(String status, Long customerId, boolean overdueOnly, String query) {
        Long businessId = currentUser.businessId();
        statusService.refreshBusiness(businessId);
        InvoiceStatus filter = null;
        if (status != null && !status.isBlank()) {
            try {
                filter = InvoiceStatus.valueOf(status.trim().toUpperCase(Locale.ROOT));
            } catch (IllegalArgumentException ex) {
                throw ApiException.badRequest("Unknown invoice status: " + status);
            }
        }
        String q = query == null || query.isBlank() ? null : query.trim();
        LocalDate today = LocalDate.now();
        return invoiceRepository.search(businessId, filter, customerId, overdueOnly, today, q).stream()
                .map(invoice -> toSummary(invoice, today))
                .toList();
    }

    @Transactional(readOnly = true)
    public InvoiceDtos.InvoiceDto get(Long id) {
        Invoice invoice = findDetailedOwned(id);
        LocalDate today = LocalDate.now();
        return toDetail(invoice, today);
    }

    @Transactional
    public InvoiceDtos.InvoiceDto create(InvoiceDtos.InvoiceRequest request) {
        Long businessId = currentUser.businessId();
        Customer customer = customerRepository.findByIdAndBusinessId(request.customerId(), businessId)
                .orElseThrow(() -> ApiException.badRequest("Select a customer for this invoice"));

        if (request.dueDate().isBefore(request.issueDate())) {
            throw ApiException.badRequest("Due date cannot be before the issue date");
        }

        String number = request.invoiceNumber() == null || request.invoiceNumber().isBlank()
                ? nextInvoiceNumber(request.issueDate().getYear())
                : request.invoiceNumber().trim();
        if (invoiceRepository.existsByBusinessIdAndInvoiceNumber(businessId, number)) {
            throw ApiException.conflict("Invoice number " + number + " already exists");
        }

        Invoice invoice = new Invoice();
        invoice.setBusiness(currentUser.business());
        invoice.setCustomer(customer);
        invoice.setInvoiceNumber(number);
        invoice.setIssueDate(request.issueDate());
        invoice.setDueDate(request.dueDate());
        invoice.setCurrency(currentUser.business().getCurrency());
        invoice.setNotes(request.notes());
        invoice.setAmountPaid(BigDecimal.ZERO);

        List<InvoiceLine> lines = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;
        for (InvoiceDtos.InvoiceLineRequest lineRequest : request.lines()) {
            InvoiceLine line = new InvoiceLine(
                    lineRequest.description().trim(),
                    lineRequest.quantity(),
                    lineRequest.unitPrice().setScale(2, RoundingMode.HALF_UP));
            total = total.add(line.getAmount());
            lines.add(line);
        }
        if (total.signum() <= 0) {
            throw ApiException.badRequest("Invoice total must be greater than zero");
        }
        invoice.setTotalAmount(total.setScale(2, RoundingMode.HALF_UP));
        lines.forEach(invoice::addLine);
        invoice.setStatus(InvoiceStatus.PENDING);
        invoice.setCreatedAt(java.time.LocalDateTime.now());
        invoice.setUpdatedAt(java.time.LocalDateTime.now());

        Invoice saved = invoiceRepository.save(invoice);
        statusService.refresh(saved);
        invoiceRepository.save(saved);
        reminderService.scheduleForInvoice(saved);
        return toDetail(saved, LocalDate.now());
    }

    @Transactional(readOnly = true)
    public String nextInvoiceNumber(int year) {
        Long businessId = currentUser.businessId();
        String prefix = "INV-" + year + "-";
        int max = 0;
        for (String number : invoiceRepository.findAllInvoiceNumbers(businessId)) {
            if (number != null && number.startsWith(prefix)) {
                try {
                    max = Math.max(max, Integer.parseInt(number.substring(prefix.length())));
                } catch (NumberFormatException ignored) {
                    // manually entered numbers are left alone
                }
            }
        }
        String candidate;
        int next = max + 1;
        do {
            candidate = prefix + String.format("%04d", next++);
        } while (invoiceRepository.existsByBusinessIdAndInvoiceNumber(businessId, candidate));
        return candidate;
    }

    public Invoice findDetailedOwned(Long id) {
        return invoiceRepository.findDetailed(id, currentUser.businessId())
                .orElseThrow(() -> ApiException.notFound("Invoice not found"));
    }

    public InvoiceDtos.InvoiceDto toDetail(Invoice invoice, LocalDate today) {
        List<InvoiceDtos.InvoiceLineDto> lines = invoice.getLines().stream()
                .map(line -> new InvoiceDtos.InvoiceLineDto(
                        line.getId(), line.getDescription(), line.getQuantity(),
                        line.getUnitPrice(), line.getAmount()))
                .toList();
        int followUps = (int) followUpRepository.countByInvoiceId(invoice.getId());
        int reminders = (int) reminderRepository.countByInvoiceId(invoice.getId());
        long daysOverdue = invoice.isOverdue(today)
                ? ChronoUnit.DAYS.between(invoice.getDueDate(), today)
                : 0;
        return new InvoiceDtos.InvoiceDto(
                invoice.getId(),
                invoice.getInvoiceNumber(),
                invoice.getCustomer().getId(),
                invoice.getCustomer().getName(),
                invoice.getCustomer().getEmail(),
                invoice.getCustomer().getPhone(),
                invoice.getIssueDate(),
                invoice.getDueDate(),
                invoice.getCurrency(),
                effectiveStatus(invoice, today).name(),
                invoice.isOverdue(today),
                daysOverdue,
                invoice.getTotalAmount(),
                invoice.getAmountPaid(),
                invoice.outstandingAmount(),
                invoice.getNotes(),
                invoice.getCreatedAt(),
                lines,
                followUps,
                reminders);
    }

    public InvoiceDtos.InvoiceSummaryDto toSummary(Invoice invoice, LocalDate today) {
        long daysOverdue = invoice.isOverdue(today)
                ? ChronoUnit.DAYS.between(invoice.getDueDate(), today)
                : 0;
        return new InvoiceDtos.InvoiceSummaryDto(
                invoice.getId(),
                invoice.getInvoiceNumber(),
                invoice.getCustomer().getId(),
                invoice.getCustomer().getName(),
                invoice.getIssueDate(),
                invoice.getDueDate(),
                invoice.getCurrency(),
                effectiveStatus(invoice, today).name(),
                invoice.isOverdue(today),
                daysOverdue,
                invoice.getTotalAmount(),
                invoice.getAmountPaid(),
                invoice.outstandingAmount());
    }

    private InvoiceStatus effectiveStatus(Invoice invoice, LocalDate today) {
        InvoiceStatus computed = statusService.compute(invoice, today);
        return computed;
    }
}
