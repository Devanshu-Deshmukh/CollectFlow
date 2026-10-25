package com.collectflow.service;

import com.collectflow.domain.Invoice;
import com.collectflow.domain.Payment;
import com.collectflow.repo.InvoiceRepository;
import com.collectflow.repo.PaymentRepository;
import com.collectflow.security.CurrentUser;
import com.collectflow.web.ApiException;
import com.collectflow.web.dto.PaymentDtos;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final InvoiceRepository invoiceRepository;
    private final InvoiceStatusService statusService;
    private final ReminderService reminderService;
    private final CurrentUser currentUser;

    public PaymentService(PaymentRepository paymentRepository,
                          InvoiceRepository invoiceRepository,
                          InvoiceStatusService statusService,
                          ReminderService reminderService,
                          CurrentUser currentUser) {
        this.paymentRepository = paymentRepository;
        this.invoiceRepository = invoiceRepository;
        this.statusService = statusService;
        this.reminderService = reminderService;
        this.currentUser = currentUser;
    }

    @Transactional
    public PaymentDtos.PaymentDto record(Long invoiceId, PaymentDtos.PaymentRequest request) {
        Invoice invoice = invoiceRepository.findDetailed(invoiceId, currentUser.businessId())
                .orElseThrow(() -> ApiException.notFound("Invoice not found"));

        BigDecimal amount = request.amount().setScale(2, RoundingMode.HALF_UP);
        BigDecimal outstanding = invoice.outstandingAmount();
        if (amount.compareTo(outstanding) > 0) {
            throw ApiException.badRequest("Payment exceeds the outstanding balance of "
                    + TemplateRenderer.formatMoney(outstanding, invoice.getCurrency()));
        }

        Payment payment = new Payment();
        payment.setInvoice(invoice);
        payment.setAmount(amount);
        payment.setPaymentDate(request.paymentDate());
        payment.setMethod(blankToNull(request.method()));
        payment.setReference(blankToNull(request.reference()));
        payment.setNotes(blankToNull(request.notes()));
        payment.setCreatedBy(currentUser.user());
        payment.setCreatedAt(LocalDateTime.now());
        paymentRepository.save(payment);

        invoice.setAmountPaid(invoice.getAmountPaid().add(amount).setScale(2, RoundingMode.HALF_UP));
        statusService.refresh(invoice);
        invoice.setUpdatedAt(LocalDateTime.now());
        invoiceRepository.save(invoice);

        if (invoice.outstandingAmount().signum() == 0) {
            reminderService.cancelScheduled(invoice.getId(), "Invoice was fully paid");
        }

        return toDto(payment);
    }

    @Transactional(readOnly = true)
    public List<PaymentDtos.PaymentDto> forInvoice(Long invoiceId) {
        invoiceRepository.findDetailed(invoiceId, currentUser.businessId())
                .orElseThrow(() -> ApiException.notFound("Invoice not found"));
        return paymentRepository.findForInvoice(invoiceId).stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<PaymentDtos.PaymentDto> recent(int limit) {
        return paymentRepository
                .findRecentForBusiness(currentUser.businessId(), PageRequest.of(0, Math.min(Math.max(limit, 1), 50)))
                .stream()
                .map(this::toDto)
                .toList();
    }

    public PaymentDtos.PaymentDto toDto(Payment payment) {
        return new PaymentDtos.PaymentDto(
                payment.getId(),
                payment.getInvoice().getId(),
                payment.getInvoice().getInvoiceNumber(),
                payment.getInvoice().getCustomer().getName(),
                payment.getAmount(),
                payment.getPaymentDate(),
                payment.getMethod(),
                payment.getReference(),
                payment.getNotes(),
                payment.getCreatedAt());
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
