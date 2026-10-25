package com.collectflow.web;

import com.collectflow.service.FollowUpService;
import com.collectflow.web.dto.FollowUpDtos;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class FollowUpController {

    private final FollowUpService followUpService;

    public FollowUpController(FollowUpService followUpService) {
        this.followUpService = followUpService;
    }

    @GetMapping("/api/invoices/{invoiceId}/follow-ups")
    public List<FollowUpDtos.FollowUpDto> forInvoice(@PathVariable Long invoiceId) {
        return followUpService.forInvoice(invoiceId);
    }

    @PostMapping("/api/invoices/{invoiceId}/follow-ups")
    @ResponseStatus(HttpStatus.CREATED)
    public FollowUpDtos.FollowUpDto create(@PathVariable Long invoiceId,
                                           @Valid @RequestBody FollowUpDtos.FollowUpRequest request) {
        return followUpService.create(invoiceId, request);
    }

    @GetMapping("/api/follow-ups")
    public List<FollowUpDtos.FollowUpDto> openTasks() {
        return followUpService.openTasks();
    }

    @PatchMapping("/api/follow-ups/{id}")
    public FollowUpDtos.FollowUpDto updateStatus(@PathVariable Long id,
                                                 @Valid @RequestBody FollowUpDtos.StatusUpdate request) {
        return followUpService.updateStatus(id, request.status());
    }
}
