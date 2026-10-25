package com.collectflow.service;

import com.collectflow.domain.FollowUp;
import com.collectflow.domain.FollowUpStatus;
import com.collectflow.domain.Invoice;
import com.collectflow.domain.User;
import com.collectflow.repo.BusinessMembershipRepository;
import com.collectflow.repo.FollowUpRepository;
import com.collectflow.repo.InvoiceRepository;
import com.collectflow.repo.UserRepository;
import com.collectflow.security.CurrentUser;
import com.collectflow.web.ApiException;
import com.collectflow.web.dto.FollowUpDtos;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class FollowUpService {

    private final FollowUpRepository followUpRepository;
    private final InvoiceRepository invoiceRepository;
    private final BusinessMembershipRepository membershipRepository;
    private final UserRepository userRepository;
    private final CurrentUser currentUser;

    public FollowUpService(FollowUpRepository followUpRepository,
                           InvoiceRepository invoiceRepository,
                           BusinessMembershipRepository membershipRepository,
                           UserRepository userRepository,
                           CurrentUser currentUser) {
        this.followUpRepository = followUpRepository;
        this.invoiceRepository = invoiceRepository;
        this.membershipRepository = membershipRepository;
        this.userRepository = userRepository;
        this.currentUser = currentUser;
    }

    @Transactional(readOnly = true)
    public List<FollowUpDtos.FollowUpDto> forInvoice(Long invoiceId) {
        Invoice invoice = invoiceRepository.findDetailed(invoiceId, currentUser.businessId())
                .orElseThrow(() -> ApiException.notFound("Invoice not found"));
        return followUpRepository.findForInvoice(invoice.getId()).stream().map(this::toDto).toList();
    }

    @Transactional
    public FollowUpDtos.FollowUpDto create(Long invoiceId, FollowUpDtos.FollowUpRequest request) {
        Invoice invoice = invoiceRepository.findDetailed(invoiceId, currentUser.businessId())
                .orElseThrow(() -> ApiException.notFound("Invoice not found"));

        FollowUp followUp = new FollowUp();
        followUp.setInvoice(invoice);
        followUp.setActivityType(request.activityType());
        followUp.setNotes(request.notes().trim());
        followUp.setCreatedBy(currentUser.user());
        followUp.setDueDate(request.dueDate());

        if (request.assignedToUserId() != null) {
            User assignee = userRepository.findById(request.assignedToUserId())
                    .orElseThrow(() -> ApiException.badRequest("Assigned team member not found"));
            if (!membershipRepository.existsByUserIdAndBusinessId(assignee.getId(), currentUser.businessId())) {
                throw ApiException.badRequest("That user is not part of this business");
            }
            followUp.setAssignedTo(assignee);
        }

        FollowUpStatus status = request.status() == null
                ? (request.dueDate() != null || request.assignedToUserId() != null
                    ? FollowUpStatus.OPEN : FollowUpStatus.DONE)
                : request.status();
        followUp.setStatus(status);
        followUp.setCreatedAt(LocalDateTime.now());
        if (status == FollowUpStatus.DONE) {
            followUp.setCompletedAt(LocalDateTime.now());
        }
        return toDto(followUpRepository.save(followUp));
    }

    @Transactional
    public FollowUpDtos.FollowUpDto updateStatus(Long id, FollowUpStatus status) {
        FollowUp followUp = followUpRepository.findByIdAndInvoiceBusinessId(id, currentUser.businessId())
                .orElseThrow(() -> ApiException.notFound("Follow-up not found"));
        followUp.setStatus(status);
        followUp.setCompletedAt(status == FollowUpStatus.DONE ? LocalDateTime.now() : null);
        return toDto(followUpRepository.save(followUp));
    }

    @Transactional(readOnly = true)
    public List<FollowUpDtos.FollowUpDto> openTasks() {
        return followUpRepository.findByBusinessAndStatus(currentUser.businessId(), FollowUpStatus.OPEN).stream()
                .map(this::toDto)
                .toList();
    }

    public FollowUpDtos.FollowUpDto toDto(FollowUp followUp) {
        return new FollowUpDtos.FollowUpDto(
                followUp.getId(),
                followUp.getInvoice().getId(),
                followUp.getInvoice().getInvoiceNumber(),
                followUp.getInvoice().getCustomer().getName(),
                followUp.getActivityType().name(),
                followUp.getNotes(),
                followUp.getCreatedBy() == null ? null : followUp.getCreatedBy().getId(),
                followUp.getCreatedBy() == null ? null : followUp.getCreatedBy().getName(),
                followUp.getAssignedTo() == null ? null : followUp.getAssignedTo().getId(),
                followUp.getAssignedTo() == null ? null : followUp.getAssignedTo().getName(),
                followUp.getDueDate(),
                followUp.getStatus().name(),
                followUp.getCreatedAt(),
                followUp.getCompletedAt());
    }
}
