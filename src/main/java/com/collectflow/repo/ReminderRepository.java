package com.collectflow.repo;

import com.collectflow.domain.Reminder;
import com.collectflow.domain.ReminderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface ReminderRepository extends JpaRepository<Reminder, Long> {

    List<Reminder> findByInvoiceIdOrderByScheduledAtAsc(Long invoiceId);

    boolean existsByInvoiceIdAndTemplateId(Long invoiceId, Long templateId);

    @Query("""
            select r from Reminder r
            join fetch r.invoice i
            join fetch i.customer
            where i.business.id = :businessId
              and r.status = :status
              and r.scheduledAt <= :until
            order by r.scheduledAt asc
            """)
    List<Reminder> findByBusinessAndStatusDue(@Param("businessId") Long businessId,
                                              @Param("status") ReminderStatus status,
                                              @Param("until") LocalDateTime until);

    @Query("""
            select r from Reminder r
            join fetch r.invoice i
            join fetch i.customer
            where i.business.id = :businessId
            order by r.scheduledAt desc
            """)
    List<Reminder> findForBusiness(@Param("businessId") Long businessId);

    @Query("""
            select r from Reminder r
            join fetch r.invoice i
            join fetch i.customer
            where r.status = :status and r.scheduledAt <= :until
            order by r.scheduledAt asc
            """)
    List<Reminder> findDue(@Param("status") ReminderStatus status,
                           @Param("until") LocalDateTime until);

    long countByInvoiceId(Long invoiceId);

    long countByInvoiceBusinessIdAndStatusAndScheduledAtBetween(Long businessId,
                                                                ReminderStatus status,
                                                                LocalDateTime from,
                                                                LocalDateTime to);
}
