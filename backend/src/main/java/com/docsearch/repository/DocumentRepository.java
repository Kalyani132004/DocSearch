package com.docsearch.repository;

import com.docsearch.entity.Document;
import com.docsearch.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface DocumentRepository extends JpaRepository<Document, Long> {

    Page<Document> findByUploadedBy(User user, Pageable pageable);

    Page<Document> findByFileType(String fileType, Pageable pageable);

    long countByUploadedAtBetween(LocalDateTime start, LocalDateTime end);

    List<Document> findByUploadedAtBetween(LocalDateTime start, LocalDateTime end);

    long countByFileType(String fileType);

    Page<Document> findAllByOrderByUploadedAtDesc(Pageable pageable);

    @Query("SELECT d FROM Document d WHERE LOWER(d.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(d.author) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<Document> searchByTitleOrAuthor(@Param("keyword") String keyword);

    @Query("SELECT d.fileType, COUNT(d) FROM Document d GROUP BY d.fileType")
    List<Object[]> countGroupByFileType();
}
