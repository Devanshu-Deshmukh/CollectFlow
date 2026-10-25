package com.collectflow.web;

import com.collectflow.service.InvoiceService;
import com.collectflow.web.dto.InvoiceDtos;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/invoices")
public class InvoiceController {

    private final InvoiceService invoiceService;

    public InvoiceController(InvoiceService invoiceService) {
        this.invoiceService = invoiceService;
    }

    @GetMapping
    public List<InvoiceDtos.InvoiceSummaryDto> list(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long customerId,
            @RequestParam(required = false, defaultValue = "false") boolean overdue,
            @RequestParam(required = false) String q) {
        return invoiceService.list(status, customerId, overdue, q);
    }

    @GetMapping("/next-number")
    public Map<String, String> nextNumber(@RequestParam(required = false) Integer year) {
        int target = year == null ? LocalDate.now().getYear() : year;
        return Map.of("invoiceNumber", invoiceService.nextInvoiceNumber(target));
    }

    @GetMapping("/{id}")
    public InvoiceDtos.InvoiceDto get(@PathVariable Long id) {
        return invoiceService.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public InvoiceDtos.InvoiceDto create(@Valid @RequestBody InvoiceDtos.InvoiceRequest request) {
        return invoiceService.create(request);
    }
}
