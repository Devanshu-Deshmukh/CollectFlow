package com.collectflow.service;

import com.collectflow.domain.Invoice;

import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.Map;

public final class TemplateRenderer {

    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("d MMM yyyy", Locale.ENGLISH);

    private TemplateRenderer() {
    }

    /**
     * Builds the placeholder values available to reminder templates.
     * daysOverdue is measured against the scheduled send date so a reminder written today
     * for next week reads correctly when it is sent.
     */
    public static Map<String, String> variables(Invoice invoice, String businessName, LocalDate asOf) {
        BigDecimal outstanding = invoice.outstandingAmount();
        long daysOverdue = Math.max(0, java.time.temporal.ChronoUnit.DAYS.between(invoice.getDueDate(), asOf));
        return Map.of(
                "customerName", invoice.getCustomer().getName(),
                "businessName", businessName == null ? "your supplier" : businessName,
                "invoiceNumber", invoice.getInvoiceNumber(),
                "amount", formatMoney(outstanding, invoice.getCurrency()),
                "totalAmount", formatMoney(invoice.getTotalAmount(), invoice.getCurrency()),
                "dueDate", invoice.getDueDate().format(DATE),
                "issueDate", invoice.getIssueDate().format(DATE),
                "daysOverdue", String.valueOf(daysOverdue),
                "currency", invoice.getCurrency());
    }

    public static String render(String template, Map<String, String> variables) {
        if (template == null) {
            return "";
        }
        String result = template;
        for (Map.Entry<String, String> entry : variables.entrySet()) {
            result = result.replace("{{" + entry.getKey() + "}}", entry.getValue());
        }
        return result;
    }

    public static String formatMoney(BigDecimal amount, String currency) {        String code = currency == null ? "INR" : currency;
        String symbol = switch (code) {
            case "USD" -> "$";
            case "EUR" -> "€";
            case "GBP" -> "£";
            case "AED" -> "AED ";
            case "SGD" -> "S$ ";
            default -> "₹";
        };
        BigDecimal value = amount == null ? BigDecimal.ZERO : amount;
        if ("INR".equals(code)) {
            return symbol + indianGrouping(value);
        }
        DecimalFormat format = new DecimalFormat("#,##0.00", DecimalFormatSymbols.getInstance(Locale.ENGLISH));
        return symbol + format.format(value);
    }

    /** Java's DecimalFormat only supports uniform grouping, so lakh/crore grouping is formatted here. */
    static String indianGrouping(BigDecimal amount) {
        String plain = amount.setScale(2, java.math.RoundingMode.HALF_UP).toPlainString();
        String sign = "";
        if (plain.startsWith("-")) {
            sign = "-";
            plain = plain.substring(1);
        }
        int dot = plain.indexOf('.');
        String integerPart = plain.substring(0, dot);
        String decimals = plain.substring(dot);
        if (integerPart.length() <= 3) {
            return sign + integerPart + decimals;
        }
        String lastThree = integerPart.substring(integerPart.length() - 3);
        String rest = integerPart.substring(0, integerPart.length() - 3);
        StringBuilder grouped = new StringBuilder();
        while (rest.length() > 2) {
            grouped.insert(0, "," + rest.substring(rest.length() - 2));
            rest = rest.substring(0, rest.length() - 2);
        }
        return sign + rest + grouped + "," + lastThree + decimals;
    }
}
