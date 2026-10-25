package com.collectflow.repo;

import com.collectflow.domain.FollowUp;
import com.collectflow.domain.FollowUpStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface FollowUpRepository extends JpaRepository<FollowUp, Long> {

    @Query("""
            select f from FollowUp f
            join fetch f.invoice i
            join fetch i.customer
            left join fetch f.assignedTo
            where i.id = :invoiceId
            order by f.createdAt desc, f.id desc
            """)
    List<FollowUp> findForInvoice(@Param("invoiceId") Long invoiceId);

    @Query("""
            select f from FollowUp f
            join fetch f.invoice i
            join fetch i.customer
            left join fetch f.assignedTo
            where i.business.id = :businessId and f.status = :status
            order by f.dueDate asc, f.id asc
            """)
    List<FollowUp> findByBusinessAndStatus(@Param("businessId") Long businessId,
                                           @Param("status") FollowUpStatus status);

    long countByInvoiceBusinessIdAndStatus(Long businessId, FollowUpStatus status);

    long countByInvoiceId(Long invoiceId);

    Optional<FollowUp> findByIdAndInvoiceBusinessId(Long id, Long businessId);

    long countByInvoiceBusinessIdAndStatusAndDueDateBefore(Long businessId,
                                                           FollowUpStatus status,
                                                           LocalDate date);
}
