package com.collectflow.service;

import com.collectflow.domain.Customer;
import com.collectflow.domain.Invoice;
import com.collectflow.repo.CustomerRepository;
import com.collectflow.repo.InvoiceRepository;
import com.collectflow.security.CurrentUser;
import com.collectflow.web.ApiException;
import com.collectflow.web.dto.CustomerDtos;
import com.collectflow.web.dto.InvoiceDtos;
import com.collectflow.web.dto.ReportDtos;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * CSV import/export kept deliberately close to the columns a small business already
 * uses in a spreadsheet. Each imported row is committed separately so one bad row
 * does not discard the whole file.
 */
@Service
public class CsvService {

    private static final List<DateTimeFormatter> DATE_FORMATS = List.of(
            DateTimeFormatter.ISO_LOCAL_DATE,
            DateTimeFormatter.ofPattern("d/M/yyyy", Locale.ENGLISH),
            DateTimeFormatter.ofPattern("d-M-yyyy", Locale.ENGLISH),
            DateTimeFormatter.ofPattern("M/d/yyyy", Locale.ENGLISH),
            DateTimeFormatter.ofPattern("d MMM yyyy", Locale.ENGLISH));

    private final CustomerService customerService;
    private final InvoiceService invoiceService;
    private final CustomerRepository customerRepository;
    private final InvoiceRepository invoiceRepository;
    private final CurrentUser currentUser;

    public CsvService(CustomerService customerService,
                      InvoiceService invoiceService,
                      CustomerRepository customerRepository,
                      InvoiceRepository invoiceRepository,
                      CurrentUser currentUser) {
        this.customerService = customerService;
        this.invoiceService = invoiceService;
        this.customerRepository = customerRepository;
        this.invoiceRepository = invoiceRepository;
        this.currentUser = currentUser;
    }

    // ---------- export ----------

    public byte[] exportCustomers() {
        StringBuilder csv = new StringBuilder();
        csv.append(CsvUtils.row("Name", "Email", "Phone", "Company", "Notes", "Outstanding", "InvoiceCount"));
        for (CustomerDtos.CustomerDto customer : customerService.list(null)) {
            csv.append(CsvUtils.row(
                    customer.name(),
                    customer.email(),
                    customer.phone(),
                    customer.company(),
                    customer.notes(),
                    customer.outstanding().toPlainString(),
                    String.valueOf(customer.invoiceCount())));
        }
        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    public byte[] exportInvoices() {
        StringBuilder csv = new StringBuilder();
        csv.append(CsvUtils.row("InvoiceNumber", "CustomerName", "CustomerEmail", "IssueDate", "DueDate",
                "Currency", "Status", "Total", "Paid", "Outstanding", "Description", "Quantity", "UnitPrice", "Notes"));
        for (Invoice invoice : invoiceRepository.findAllForExport(currentUser.businessId())) {
            if (invoice.getLines().isEmpty()) {
                csv.append(CsvUtils.row(invoice.getInvoiceNumber(), invoice.getCustomer().getName(),
                        invoice.getCustomer().getEmail(), invoice.getIssueDate().toString(),
                        invoice.getDueDate().toString(), invoice.getCurrency(), invoice.getStatus().name(),
                        invoice.getTotalAmount().toPlainString(), invoice.getAmountPaid().toPlainString(),
                        invoice.outstandingAmount().toPlainString(), "", "", "", invoice.getNotes()));
            }
            for (var line : invoice.getLines()) {
                csv.append(CsvUtils.row(invoice.getInvoiceNumber(), invoice.getCustomer().getName(),
                        invoice.getCustomer().getEmail(), invoice.getIssueDate().toString(),
                        invoice.getDueDate().toString(), invoice.getCurrency(), invoice.getStatus().name(),
                        invoice.getTotalAmount().toPlainString(), invoice.getAmountPaid().toPlainString(),
                        invoice.outstandingAmount().toPlainString(), line.getDescription(),
                        line.getQuantity().toPlainString(), line.getUnitPrice().toPlainString(), invoice.getNotes()));
            }
        }
        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    // ---------- import ----------

    public ReportDtos.ImportResultDto importCustomers(InputStream input) {
        List<List<String>> rows = read(input);
        if (rows.isEmpty()) {
            throw ApiException.badRequest("The file is empty");
        }
        Map<String, Integer> header = header(rows.getFirst());
        requireColumns(header, "name");
        int imported = 0;
        int skipped = 0;
        List<String> errors = new ArrayList<>();
        for (int i = 1; i < rows.size(); i++) {
            List<String> row = rows.get(i);
            try {
                String name = cell(row, header, "name");
                if (name.isBlank()) {
                    skipped++;
                    errors.add("Row " + (i + 1) + ": name is required");
                    continue;
                }
                String email = cell(row, header, "email");
                boolean duplicate = customerRepository.search(currentUser.businessId(), name).stream()
                        .anyMatch(existing -> existing.getName().equalsIgnoreCase(name)
                                && equalIgnoreCase(existing.getEmail(), email));
                if (duplicate) {
                    skipped++;
                    continue;
                }
                customerService.create(new CustomerDtos.CustomerRequest(
                        name, blankToNull(email), blankToNull(cell(row, header, "phone")),
                        blankToNull(cell(row, header, "company")), blankToNull(cell(row, header, "notes"))));
                imported++;
            } catch (RuntimeException ex) {
                skipped++;
                errors.add("Row " + (i + 1) + ": " + message(ex));
            }
        }
        return new ReportDtos.ImportResultDto(imported, skipped, errors);
    }

    public ReportDtos.ImportResultDto importInvoices(InputStream input) {
        List<List<String>> rows = read(input);
        if (rows.isEmpty()) {
            throw ApiException.badRequest("The file is empty");
        }
        Map<String, Integer> header = header(rows.getFirst());
        requireColumns(header, "invoicenumber", "customername", "issuedate", "duedate", "unitprice");

        record Draft(String invoiceNumber, String customerName, String customerEmail, LocalDate issueDate,
                     LocalDate dueDate, String notes, List<InvoiceDtos.InvoiceLineRequest> lines) {
        }

        Map<String, Draft> drafts = new LinkedHashMap<>();
        List<String> errors = new ArrayList<>();
        int skipped = 0;

        for (int i = 1; i < rows.size(); i++) {
            List<String> row = rows.get(i);
            try {
                String number = cell(row, header, "invoicenumber");
                if (number.isBlank()) {
                    skipped++;
                    errors.add("Row " + (i + 1) + ": InvoiceNumber is required");
                    continue;
                }
                String customerName = cell(row, header, "customername");
                String description = cell(row, header, "description");
                BigDecimal quantity = decimal(cell(row, header, "quantity"), BigDecimal.ONE);
                BigDecimal unitPrice = decimal(cell(row, header, "unitprice"), null);
                if (customerName.isBlank()) {
                    skipped++;
                    errors.add("Row " + (i + 1) + ": CustomerName is required");
                    continue;
                }
                if (unitPrice == null) {
                    skipped++;
                    errors.add("Row " + (i + 1) + ": UnitPrice is required");
                    continue;
                }
                Draft existing = drafts.get(number);
                if (existing == null) {
                    LocalDate issueDate = date(cell(row, header, "issuedate"), LocalDate.now());
                    LocalDate dueDate = date(cell(row, header, "duedate"), issueDate.plusDays(30));
                    if (dueDate.isBefore(issueDate)) {
                        throw ApiException.badRequest("Due date is before the issue date");
                    }
                    existing = new Draft(number, customerName, cell(row, header, "customeremail"),
                            issueDate, dueDate, blankToNull(cell(row, header, "notes")), new ArrayList<>());
                    drafts.put(number, existing);
                }
                existing.lines().add(new InvoiceDtos.InvoiceLineRequest(
                        description.isBlank() ? "Services" : description, quantity, unitPrice));
            } catch (RuntimeException ex) {
                skipped++;
                errors.add("Row " + (i + 1) + ": " + message(ex));
            }
        }

        int imported = 0;
        for (Draft draft : drafts.values()) {
            try {
                if (invoiceRepository.existsByBusinessIdAndInvoiceNumber(currentUser.businessId(), draft.invoiceNumber())) {
                    skipped++;
                    errors.add("Invoice " + draft.invoiceNumber() + ": invoice number already exists");
                    continue;
                }
                if (draft.lines().isEmpty()) {
                    skipped++;
                    errors.add("Invoice " + draft.invoiceNumber() + ": no line items found");
                    continue;
                }
                Long customerId = resolveCustomer(draft.customerName(), draft.customerEmail());
                invoiceService.create(new InvoiceDtos.InvoiceRequest(
                        customerId,
                        draft.invoiceNumber(),
                        draft.issueDate(),
                        draft.dueDate(),
                        draft.notes(),
                        draft.lines()));
                imported++;
            } catch (RuntimeException ex) {
                skipped++;
                errors.add("Invoice " + draft.invoiceNumber() + ": " + message(ex));
            }
        }
        return new ReportDtos.ImportResultDto(imported, skipped, errors);
    }

    private Long resolveCustomer(String name, String email) {
        if (email != null && !email.isBlank()) {
            for (Customer customer : customerRepository.search(currentUser.businessId(), email)) {
                if (equalIgnoreCase(customer.getEmail(), email)) {
                    return customer.getId();
                }
            }
        }
        for (Customer customer : customerRepository.findByBusinessIdAndNameIgnoreCase(currentUser.businessId(), name)) {
            return customer.getId();
        }
        return customerService.create(new CustomerDtos.CustomerRequest(name, blankToNull(email), null, null, null)).id();
    }

    private List<List<String>> read(InputStream input) {
        try {
            return CsvUtils.parse(new String(input.readAllBytes(), StandardCharsets.UTF_8));
        } catch (IOException ex) {
            throw ApiException.badRequest("Could not read the uploaded file");
        }
    }

    private Map<String, Integer> header(List<String> row) {
        Map<String, Integer> header = new LinkedHashMap<>();
        for (int i = 0; i < row.size(); i++) {
            header.put(row.get(i).trim().toLowerCase(Locale.ROOT).replace(" ", "").replace("_", ""), i);
        }
        return header;
    }

    private void requireColumns(Map<String, Integer> header, String... columns) {
        for (String column : columns) {
            if (!header.containsKey(column)) {
                throw ApiException.badRequest("Missing column '" + column + "' in the CSV header. Download the template to see the expected columns.");
            }
        }
    }

    private String cell(List<String> row, Map<String, Integer> header, String column) {
        Integer index = header.get(column);
        if (index == null || index >= row.size()) {
            return "";
        }
        return row.get(index).trim();
    }

    private LocalDate date(String value, LocalDate fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        for (DateTimeFormatter format : DATE_FORMATS) {
            try {
                return LocalDate.parse(value.trim(), format);
            } catch (DateTimeParseException ignored) {
                // try the next supported format
            }
        }
        throw ApiException.badRequest("Unrecognised date '" + value + "' (use yyyy-MM-dd)");
    }

    private BigDecimal decimal(String value, BigDecimal fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        try {
            return new BigDecimal(value.trim().replace(",", "").replace("₹", "").replace("$", ""));
        } catch (NumberFormatException ex) {
            throw ApiException.badRequest("Unrecognised amount '" + value + "'");
        }
    }

    private boolean equalIgnoreCase(String a, String b) {
        return a == null ? b == null || b.isBlank() : a.equalsIgnoreCase(b);
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String message(RuntimeException ex) {
        return ex.getMessage() == null ? "invalid row" : ex.getMessage();
    }
}
