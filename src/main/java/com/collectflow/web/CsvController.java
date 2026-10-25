package com.collectflow.web;

import com.collectflow.service.CsvService;
import com.collectflow.web.dto.ReportDtos;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDate;

@RestController
public class CsvController {

    private final CsvService csvService;

    public CsvController(CsvService csvService) {
        this.csvService = csvService;
    }

    @GetMapping("/api/export/customers.csv")
    public ResponseEntity<byte[]> exportCustomers() {
        return download(csvService.exportCustomers(), "collectflow-customers-" + LocalDate.now() + ".csv");
    }

    @GetMapping("/api/export/invoices.csv")
    public ResponseEntity<byte[]> exportInvoices() {
        return download(csvService.exportInvoices(), "collectflow-invoices-" + LocalDate.now() + ".csv");
    }

    @PostMapping(value = "/api/import/customers", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ReportDtos.ImportResultDto importCustomers(@RequestParam("file") MultipartFile file) {
        return csvService.importCustomers(open(file));
    }

    @PostMapping(value = "/api/import/invoices", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ReportDtos.ImportResultDto importInvoices(@RequestParam("file") MultipartFile file) {
        return csvService.importInvoices(open(file));
    }

    private InputStream open(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw ApiException.badRequest("Choose a CSV file to upload");
        }
        String name = file.getOriginalFilename();
        if (name != null && !name.toLowerCase().endsWith(".csv")) {
            throw ApiException.badRequest("Only .csv files can be imported");
        }
        try {
            return file.getInputStream();
        } catch (IOException ex) {
            throw ApiException.badRequest("Could not read the uploaded file");
        }
    }

    private ResponseEntity<byte[]> download(byte[] content, String filename) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(new MediaType("text", "csv", java.nio.charset.StandardCharsets.UTF_8))
                .body(content);
    }
}
