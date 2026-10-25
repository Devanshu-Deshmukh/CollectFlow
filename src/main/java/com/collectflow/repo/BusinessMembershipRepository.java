package com.collectflow.repo;

import com.collectflow.domain.BusinessMembership;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface BusinessMembershipRepository extends JpaRepository<BusinessMembership, Long> {

    Optional<BusinessMembership> findFirstByUserIdOrderByIdAsc(Long userId);

    List<BusinessMembership> findByBusinessIdOrderByIdAsc(Long businessId);

    @Query("""
            select m from BusinessMembership m
            join fetch m.user
            where m.business.id = :businessId
            order by m.id asc
            """)
    List<BusinessMembership> findWithUsersByBusinessId(@Param("businessId") Long businessId);

    boolean existsByUserIdAndBusinessId(Long userId, Long businessId);
}
