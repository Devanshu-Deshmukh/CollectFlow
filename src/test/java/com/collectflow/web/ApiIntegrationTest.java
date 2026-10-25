package com.collectflow.web;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class ApiIntegrationTest {

    @Autowired
    private MockMvc mvc;

    private String registerBusiness(String businessName) throws Exception {
        String email = "owner-" + UUID.randomUUID() + "@example.in";
        String body = """
                {
                  "name": "Test Owner",
                  "email": "%s",
                  "password": "password123",
                  "businessName": "%s",
                  "currency": "INR"
                }
                """.formatted(email, businessName);
        MvcResult result = mvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.business.name").value(businessName))
                .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.token");
    }

    private long createCustomer(String token, String name, String email) throws Exception {
        MvcResult result = mvc.perform(post("/api/customers")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name": "%s", "email": "%s", "phone": "+91 90000 00000"}
                                """.formatted(name, email)))
                .andExpect(status().isCreated())
                .andReturn();
        return ((Number) JsonPath.read(result.getResponse().getContentAsString(), "$.id")).longValue();
    }

    @Test
    void registerInvoicePayAndReportFlow() throws Exception {
        String token = registerBusiness("Sunrise Consulting");
        long customerId = createCustomer(token, "Northstar Logistics", "ap@northstar.in");

        LocalDate issue = LocalDate.now().minusDays(5);
        LocalDate due = LocalDate.now().plusDays(20);
        MvcResult invoiceResult = mvc.perform(post("/api/invoices")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "customerId": %d,
                                  "issueDate": "%s",
                                  "dueDate": "%s",
                                  "notes": "Retainer",
                                  "lines": [
                                    {"description": "Design retainer", "quantity": 2, "unitPrice": 25000},
                                    {"description": "Photography", "quantity": 1, "unitPrice": 7500}
                                  ]
                                }
                                """.formatted(customerId, issue, due)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.invoiceNumber").value(org.hamcrest.Matchers.matchesPattern("INV-\\d{4}-0001")))
                .andExpect(jsonPath("$.totalAmount").value(57500.00))
                .andExpect(jsonPath("$.outstandingAmount").value(57500.00))
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.lines.length()").value(2))
                .andExpect(jsonPath("$.reminderCount").value(3))
                .andReturn();
        long invoiceId = ((Number) JsonPath.read(invoiceResult.getResponse().getContentAsString(), "$.id")).longValue();

        mvc.perform(post("/api/invoices/{id}/payments", invoiceId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"amount": 20000, "paymentDate": "%s", "method": "UPI", "reference": "UPI/123"}
                                """.formatted(LocalDate.now())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.amount").value(20000.00));

        mvc.perform(get("/api/invoices/{id}", invoiceId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PARTIALLY_PAID"))
                .andExpect(jsonPath("$.amountPaid").value(20000.00))
                .andExpect(jsonPath("$.outstandingAmount").value(37500.00));

        mvc.perform(get("/api/dashboard").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalOutstanding").value(37500.00))
                .andExpect(jsonPath("$.overdueCount").value(0))
                .andExpect(jsonPath("$.customerCount").value(1))
                .andExpect(jsonPath("$.totalInvoiceCount").value(1));

        mvc.perform(get("/api/reports/ageing").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalOutstanding").value(37500.00))
                .andExpect(jsonPath("$.rows[0].customerName").value("Northstar Logistics"));

        mvc.perform(get("/api/reports/expected-collections").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalExpected").value(37500.00))
                .andExpect(jsonPath("$.windows.length()").value(6));

        mvc.perform(get("/api/export/invoices.csv").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(content().string(org.hamcrest.Matchers.containsString("InvoiceNumber,CustomerName")))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("Northstar Logistics")));

        mvc.perform(get("/api/reminder-templates").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3));
    }

    @Test
    void rejectsRequestsWithoutToken() throws Exception {
        mvc.perform(get("/api/dashboard"))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/invoices"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void validatesInvoicePayload() throws Exception {
        String token = registerBusiness("Validation Co");
        long customerId = createCustomer(token, "Aria Interiors", "meera@aria.in");

        mvc.perform(post("/api/invoices")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"customerId": %d, "issueDate": "%s", "dueDate": "%s", "lines": []}
                                """.formatted(customerId, LocalDate.now(), LocalDate.now().plusDays(5))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Validation failed"))
                .andExpect(jsonPath("$.fieldErrors.lines").exists());
    }

    @Test
    void oneBusinessCannotReadAnotherBusinessInvoice() throws Exception {
        String tokenA = registerBusiness("Business A");
        long customerId = createCustomer(tokenA, "Shared Customer", "shared@customer.in");
        MvcResult result = mvc.perform(post("/api/invoices")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"customerId": %d, "issueDate": "%s", "dueDate": "%s",
                                 "lines": [{"description": "Work", "quantity": 1, "unitPrice": 5000}]}
                                """.formatted(customerId, LocalDate.now(), LocalDate.now().plusDays(10))))
                .andExpect(status().isCreated())
                .andReturn();
        long invoiceId = ((Number) JsonPath.read(result.getResponse().getContentAsString(), "$.id")).longValue();

        String tokenB = registerBusiness("Business B");
        mvc.perform(get("/api/invoices/{id}", invoiceId).header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/customers/{id}", customerId).header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isNotFound());
        assertThat(tokenA).isNotEqualTo(tokenB);
    }
}
