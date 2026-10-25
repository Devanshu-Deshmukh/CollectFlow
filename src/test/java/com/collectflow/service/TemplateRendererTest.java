package com.collectflow.service;

import com.collectflow.domain.Business;
import com.collectflow.domain.Customer;
import com.collectflow.domain.Invoice;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class TemplateRendererTest {

    private Invoice invoice(LocalDate dueDate) {
        Business business = new Business();
        business.setName("Meridian Design Studio");
        Customer customer = new Customer();
        customer.setName("Northstar Logistics");
        Invoice invoice = new Invoice();
        invoice.setBusiness(business);
        invoice.setCustomer(customer);
        invoice.setInvoiceNumber("INV-2026-0042");
        invoice.setIssueDate(dueDate.minusDays(30));
        invoice.setDueDate(dueDate);
        invoice.setCurrency("INR");
        invoice.setTotalAmount(new BigDecimal("118000.00"));
        invoice.setAmountPaid(new BigDecimal("18000.00"));
        return invoice;
    }

    @Test
    void rendersOutstandingAmountAndDaysOverdueForTheScheduledDate() {
        LocalDate due = LocalDate.of(2026, 10, 1);
        Invoice invoice = invoice(due);

        Map<String, String> variables = TemplateRenderer.variables(invoice, "Meridian Design Studio", due.plusDays(9));

        assertThat(variables)
                .containsEntry("customerName", "Northstar Logistics")
                .containsEntry("invoiceNumber", "INV-2026-0042")
                .containsEntry("daysOverdue", "9")
                .containsEntry("dueDate", "1 Oct 2026")
                .containsEntry("currency", "INR");
        assertThat(variables.get("amount")).contains("1,00,000.00");
    }

    @Test
    void replacesAllPlaceholdersAndLeavesUnknownOnesAlone() {
        Invoice invoice = invoice(LocalDate.of(2026, 10, 1));
        Map<String, String> variables = TemplateRenderer.variables(invoice, "Meridian", LocalDate.of(2026, 10, 2));

        String rendered = TemplateRenderer.render(
                "Hi {{customerName}}, {{invoiceNumber}} is due {{dueDate}}. Unknown: {{nope}}", variables);

        assertThat(rendered)
                .isEqualTo("Hi Northstar Logistics, INV-2026-0042 is due 1 Oct 2026. Unknown: {{nope}}");
    }

    @Test
    void daysOverdueIsZeroBeforeTheDueDate() {
        Invoice invoice = invoice(LocalDate.of(2026, 10, 20));
        Map<String, String> variables = TemplateRenderer.variables(invoice, "Meridian", LocalDate.of(2026, 10, 1));
        assertThat(variables.get("daysOverdue")).isEqualTo("0");
    }
}
