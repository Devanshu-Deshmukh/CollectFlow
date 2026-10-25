package com.collectflow.repo;

import com.collectflow.domain.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    List<Payment> findByInvoiceIdOrderByPaymentDateDescIdDesc(Long invoiceId);

    Optional<Payment> findByIdAndInvoiceBusinessId(Long id, Long businessId);

    @Query("""
            select p from Payment p
            join fetch p.invoice i
            join fetch i.customer
            where p.invoice.id = :invoiceId
            order by p.paymentDate desc, p.id desc
            """)
    List<Payment> findForInvoice(@Param("invoiceId") Long invoiceId);

    @Query("""
            select p from Payment p
            join fetch p.invoice i
            join fetch i.customer
            where i.business.id = :businessId
            order by p.paymentDate desc, p.id desc
            """)
    List<Payment> findRecentForBusiness(@Param("businessId") Long businessId,
                                        org.springframework.data.domain.Pageable pageable);

    @Query("""
            select p from Payment p
            join fetch p.invoice i
            where i.business.id = :businessId
              and p.paymentDate between :from and :to
            """)
    List<Payment> findByBusinessAndDateRange(@Param("businessId") Long businessId,
                                             @Param("from") LocalDate from,
                                             @Param("to") LocalDate to);
}
