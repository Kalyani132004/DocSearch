package com.docsearch.repository;

import com.docsearch.entity.Bookmark;
import com.docsearch.entity.Document;
import com.docsearch.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface BookmarkRepository extends JpaRepository<Bookmark, Long> {

    List<Bookmark> findByUser(User user);

    Optional<Bookmark> findByUserAndDocument(User user, Document document);

    boolean existsByUserAndDocument(User user, Document document);

    long countByDocument(Document document);

    long countByUser(User user);

    void deleteByUser(User user);

    @Modifying
    @Query("DELETE FROM Bookmark b WHERE b.user = :user AND b.document = :document")
    void deleteByUserAndDocument(@Param("user") User user, @Param("document") Document document);

    @Modifying
    @Transactional
    @Query("DELETE FROM Bookmark b WHERE b.document.id = :documentId")
    void deleteByDocumentId(@Param("documentId") Long documentId);

    @Modifying
    @Query("DELETE FROM Bookmark b WHERE b.user.id = :userId")
    void deleteByUserId(@Param("userId") Long userId);
}
