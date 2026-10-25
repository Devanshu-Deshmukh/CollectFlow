package com.collectflow.repo;

import com.collectflow.domain.Invoice;
import com.collectflow.domain.InvoiceStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    @Query("""
            select distinct i from Invoice i
            join fetch i.customer c
            where i.business.id = :businessId
              and (:status is null or i.status = :status)
              and (:customerId is null or c.id = :customerId)
              and (:overdueOnly = false or (i.dueDate < :today and i.amountPaid < i.totalAmount))
              and (:q is null or lower(i.invoiceNumber) like lower(concat('%', :q, '%'))
                   or lower(c.name) like lower(concat('%', :q, '%')))
            order by i.dueDate asc, i.id desc
            """)
    List<Invoice> search(@Param("businessId") Long businessId,
                         @Param("status") InvoiceStatus status,
                         @Param("customerId") Long customerId,
                         @Param("overdueOnly") boolean overdueOnly,
                         @Param("today") LocalDate today,
                         @Param("q") String q);

    @Query("""
            select distinct i from Invoice i
            join fetch i.customer
            left join fetch i.lines
            where i.id = :id and i.business.id = :businessId
            """)
    Optional<Invoice> findDetailed(@Param("id") Long id, @Param("businessId") Long businessId);

    @Query("""
            select i from Invoice i
            join fetch i.customer
            where i.business.id = :businessId and i.amountPaid < i.totalAmount
            order by i.dueDate asc
            """)
    List<Invoice> findOpenInvoices(@Param("businessId") Long businessId);

    @Query("""
            select i from Invoice i
            join fetch i.customer
            where i.business.id = :businessId and i.id in :ids
            """)
    List<Invoice> findByIdsAndBusiness(@Param("businessId") Long businessId, @Param("ids") List<Long> ids);

    @Query("select i from Invoice i where i.amountPaid < i.totalAmount")
    List<Invoice> findAllOpen();

    @Query("select i from Invoice i where i.amountPaid < i.totalAmount and i.dueDate < :today")
    List<Invoice> findAllOverdue(@Param("today") LocalDate today);

    boolean existsByBusinessIdAndInvoiceNumber(Long businessId, String invoiceNumber);

    long countByBusinessId(Long businessId);

    @Query("""
            select count(i) from Invoice i
            where i.business.id = :businessId and i.amountPaid >= i.totalAmount
            """)
    long countPaidByBusinessId(@Param("businessId") Long businessId);

    @Query("""
            select i.customer.id, count(i) from Invoice i
            where i.business.id = :businessId
            group by i.customer.id
            """)
    List<Object[]> countInvoicesByCustomer(@Param("businessId") Long businessId);

    @Query("select i.invoiceNumber from Invoice i where i.business.id = :businessId")
    List<String> findAllInvoiceNumbers(@Param("businessId") Long businessId);

    @Query("""
            select i from Invoice i
            join fetch i.customer
            where i.business.id = :businessId
              and i.dueDate < :today
              and i.amountPaid < i.totalAmount
            order by i.dueDate asc
            """)
    List<Invoice> findOverdue(@Param("businessId") Long businessId, @Param("today") LocalDate today);

    @Query("""
            select i from Invoice i
            join fetch i.customer
            where i.business.id = :businessId
              and i.amountPaid < i.totalAmount
              and i.dueDate between :from and :to
            order by i.dueDate asc
            """)
    List<Invoice> findOpenDueBetween(@Param("businessId") Long businessId,
                                     @Param("from") LocalDate from,
                                     @Param("to") LocalDate to);

    @Query("""
            select i from Invoice i
            join fetch i.customer
            where i.business.id = :businessId and i.customer.id = :customerId
            order by i.issueDate desc, i.id desc
            """)
    List<Invoice> findByCustomer(@Param("businessId") Long businessId,
                                 @Param("customerId") Long customerId);

    @Query("""
            select distinct i from Invoice i
            join fetch i.customer
            left join fetch i.lines
            where i.business.id = :businessId
            order by i.issueDate desc, i.id desc
            """)
    List<Invoice> findAllForExport(@Param("businessId") Long businessId);
}
