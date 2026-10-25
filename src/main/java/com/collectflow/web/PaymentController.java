package com.collectflow.web;

import com.collectflow.service.PaymentService;
import com.collectflow.web.dto.PaymentDtos;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @GetMapping("/api/invoices/{invoiceId}/payments")
    public List<PaymentDtos.PaymentDto> forInvoice(@PathVariable Long invoiceId) {
        return paymentService.forInvoice(invoiceId);
    }

    @PostMapping("/api/invoices/{invoiceId}/payments")
    @ResponseStatus(HttpStatus.CREATED)
    public PaymentDtos.PaymentDto record(@PathVariable Long invoiceId,
                                         @Valid @RequestBody PaymentDtos.PaymentRequest request) {
        return paymentService.record(invoiceId, request);
    }

    @GetMapping("/api/payments/recent")
    public List<PaymentDtos.PaymentDto> recent(@RequestParam(defaultValue = "10") int limit) {
        return paymentService.recent(limit);
    }
}
