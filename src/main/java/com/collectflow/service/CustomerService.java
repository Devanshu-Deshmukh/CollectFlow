package com.collectflow.service;

import com.collectflow.domain.Customer;
import com.collectflow.domain.Invoice;
import com.collectflow.repo.CustomerRepository;
import com.collectflow.repo.InvoiceRepository;
import com.collectflow.security.CurrentUser;
import com.collectflow.web.ApiException;
import com.collectflow.web.dto.CustomerDtos;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final InvoiceRepository invoiceRepository;
    private final CurrentUser currentUser;

    public CustomerService(CustomerRepository customerRepository,
                           InvoiceRepository invoiceRepository,
                           CurrentUser currentUser) {
        this.customerRepository = customerRepository;
        this.invoiceRepository = invoiceRepository;
        this.currentUser = currentUser;
    }

    @Transactional(readOnly = true)
    public List<CustomerDtos.CustomerDto> list(String query) {
        Long businessId = currentUser.businessId();
        String q = query == null || query.isBlank() ? null : query.trim();
        List<Customer> customers = customerRepository.search(businessId, q);
        Map<Long, List<Invoice>> byCustomer = invoiceRepository.findOpenInvoices(businessId).stream()
                .collect(Collectors.groupingBy(invoice -> invoice.getCustomer().getId()));
        Map<Long, Long> counts = invoiceRepository.countInvoicesByCustomer(businessId).stream()
                .collect(Collectors.toMap(row -> (Long) row[0], row -> (Long) row[1]));
        LocalDate today = LocalDate.now();
        return customers.stream()
                .map(customer -> toDto(customer, byCustomer.getOrDefault(customer.getId(), List.of()),
                        counts.getOrDefault(customer.getId(), 0L), today))
                .sorted(Comparator.comparing(CustomerDtos.CustomerDto::name, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    @Transactional(readOnly = true)
    public CustomerDtos.CustomerDto get(Long id) {
        Customer customer = findOwned(id);
        List<Invoice> open = invoiceRepository.findOpenInvoices(currentUser.businessId()).stream()
                .filter(invoice -> invoice.getCustomer().getId().equals(id))
                .toList();
        long invoiceCount = invoiceRepository.findByCustomer(currentUser.businessId(), id).size();
        return toDto(customer, open, invoiceCount, LocalDate.now());
    }

    @Transactional
    public CustomerDtos.CustomerDto create(CustomerDtos.CustomerRequest request) {
        Customer customer = new Customer();
        customer.setBusiness(currentUser.business());
        apply(customer, request);
        Customer saved = customerRepository.save(customer);
        return toDto(saved, List.of(), 0, LocalDate.now());
    }

    @Transactional
    public CustomerDtos.CustomerDto update(Long id, CustomerDtos.CustomerRequest request) {
        Customer customer = findOwned(id);
        apply(customer, request);
        customerRepository.save(customer);
        return get(id);
    }

    @Transactional
    public void delete(Long id) {
        Customer customer = findOwned(id);
        long invoices = invoiceRepository.findByCustomer(currentUser.businessId(), id).size();
        if (invoices > 0) {
            throw ApiException.conflict("This customer has " + invoices
                    + " invoice(s) and cannot be deleted. Keep the record for accurate history.");
        }
        customerRepository.delete(customer);
    }

    public Customer findOwned(Long id) {
        return customerRepository.findByIdAndBusinessId(id, currentUser.businessId())
                .orElseThrow(() -> ApiException.notFound("Customer not found"));
    }

    private void apply(Customer customer, CustomerDtos.CustomerRequest request) {
        customer.setName(request.name().trim());
        customer.setEmail(blankToNull(request.email()));
        customer.setPhone(blankToNull(request.phone()));
        customer.setCompany(blankToNull(request.company()));
        customer.setNotes(blankToNull(request.notes()));
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private CustomerDtos.CustomerDto toDto(Customer customer, List<Invoice> openInvoices,
                                          long invoiceCount, LocalDate today) {
        BigDecimal outstanding = openInvoices.stream()
                .map(Invoice::outstandingAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        long overdue = openInvoices.stream()
                .filter(invoice -> invoice.isOverdue(today))
                .count();
        return new CustomerDtos.CustomerDto(
                customer.getId(),
                customer.getName(),
                customer.getEmail(),
                customer.getPhone(),
                customer.getCompany(),
                customer.getNotes(),
                customer.getCreatedAt(),
                outstanding,
                invoiceCount,
                overdue);
    }
}
