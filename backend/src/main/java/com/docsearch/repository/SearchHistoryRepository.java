package com.docsearch.repository;

import com.docsearch.entity.SearchHistory;
import com.docsearch.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface SearchHistoryRepository extends JpaRepository<SearchHistory, Long> {

    List<SearchHistory> findByUserOrderBySearchedAtDesc(User user);

    long countByUser(User user);

    @Modifying
    @Query("DELETE FROM SearchHistory sh WHERE sh.user = :user")
    void deleteByUser(@Param("user") User user);

    @Query(value = "SELECT sh.query, COUNT(sh.id) as cnt FROM search_history sh GROUP BY sh.query ORDER BY cnt DESC LIMIT 10", nativeQuery = true)
    List<Object[]> findTopKeywords();

    @Modifying
    @Query("DELETE FROM SearchHistory s WHERE s.user.id = :userId")
    void deleteByUserId(@Param("userId") Long userId);

    @Query(value = "SELECT sh.query, COUNT(sh.id) as cnt FROM search_history sh WHERE sh.user_id = :userId GROUP BY sh.query ORDER BY cnt DESC LIMIT 10", nativeQuery = true)
    List<Object[]> findTopKeywordsByUser(@Param("userId") Long userId);

    long countBySearchedAtBetween(LocalDateTime start, LocalDateTime end);
}
