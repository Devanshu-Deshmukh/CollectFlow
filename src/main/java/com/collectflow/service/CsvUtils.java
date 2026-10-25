package com.collectflow.service;

import java.util.ArrayList;
import java.util.List;

public final class CsvUtils {

    private CsvUtils() {
    }

    public static List<List<String>> parse(String content) {
        List<List<String>> rows = new ArrayList<>();
        if (content == null) {
            return rows;
        }
        List<String> row = new ArrayList<>();
        StringBuilder field = new StringBuilder();
        boolean quoted = false;
        for (int i = 0; i < content.length(); i++) {
            char c = content.charAt(i);
            if (quoted) {
                if (c == '"') {
                    if (i + 1 < content.length() && content.charAt(i + 1) == '"') {
                        field.append('"');
                        i++;
                    } else {
                        quoted = false;
                    }
                } else {
                    field.append(c);
                }
            } else if (c == '"') {
                quoted = true;
            } else if (c == ',') {
                row.add(field.toString());
                field.setLength(0);
            } else if (c == '\n' || c == '\r') {
                if (c == '\r' && i + 1 < content.length() && content.charAt(i + 1) == '\n') {
                    i++;
                }
                row.add(field.toString());
                field.setLength(0);
                if (!row.stream().allMatch(String::isBlank)) {
                    rows.add(row);
                }
                row = new ArrayList<>();
            } else {
                field.append(c);
            }
        }
        row.add(field.toString());
        if (!row.stream().allMatch(String::isBlank)) {
            rows.add(row);
        }
        if (!rows.isEmpty()) {
            List<String> header = rows.getFirst();
            if (header != null && !header.isEmpty() && header.getFirst().startsWith("\uFEFF")) {
                header.set(0, header.getFirst().substring(1));
            }
        }
        return rows;
    }

    public static String escape(String value) {
        if (value == null) {
            return "";
        }
        boolean needsQuotes = value.contains(",") || value.contains("\"")
                || value.contains("\n") || value.contains("\r");
        String escaped = value.replace("\"", "\"\"");
        return needsQuotes ? "\"" + escaped + "\"" : escaped;
    }

    public static String row(String... values) {
        StringBuilder builder = new StringBuilder();
        for (int i = 0; i < values.length; i++) {
            if (i > 0) {
                builder.append(',');
            }
            builder.append(escape(values[i]));
        }
        builder.append("\r\n");
        return builder.toString();
    }
}
