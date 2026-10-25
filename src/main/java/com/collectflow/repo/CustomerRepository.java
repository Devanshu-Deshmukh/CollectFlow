package com.collectflow.repo;

import com.collectflow.domain.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CustomerRepository extends JpaRepository<Customer, Long> {

    List<Customer> findByBusinessIdOrderByNameAsc(Long businessId);

    Optional<Customer> findByIdAndBusinessId(Long id, Long businessId);

    boolean existsByIdAndBusinessId(Long id, Long businessId);

    long countByBusinessId(Long businessId);

    @Query("""
            select c from Customer c
            where c.business.id = :businessId
              and (:q is null or lower(c.name) like lower(concat('%', :q, '%'))
                   or lower(coalesce(c.company, '')) like lower(concat('%', :q, '%'))
                   or lower(coalesce(c.email, '')) like lower(concat('%', :q, '%')))
            order by c.name asc
            """)
    List<Customer> search(@Param("businessId") Long businessId, @Param("q") String q);

    @Query("""
            select c from Customer c
            where c.business.id = :businessId and lower(c.name) = lower(:name)
            """)
    List<Customer> findByBusinessIdAndNameIgnoreCase(@Param("businessId") Long businessId,
                                                     @Param("name") String name);
}
