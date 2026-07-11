package com.docsearch.service;

import com.docsearch.dto.DocumentDTO;
import com.docsearch.entity.Bookmark;
import com.docsearch.entity.Document;
import com.docsearch.entity.User;
import com.docsearch.exception.ResourceNotFoundException;
import com.docsearch.repository.BookmarkRepository;
import com.docsearch.repository.DocumentRepository;
import com.docsearch.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class BookmarkService {

    private final BookmarkRepository bookmarkRepository;
    private final DocumentRepository documentRepository;
    private final UserRepository userRepository;

    public BookmarkService(BookmarkRepository bookmarkRepository,
                           DocumentRepository documentRepository,
                           UserRepository userRepository) {
        this.bookmarkRepository = bookmarkRepository;
        this.documentRepository = documentRepository;
        this.userRepository = userRepository;
    }

    public DocumentDTO addBookmark(Long documentId, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", username));

        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document", "id", documentId));

        if (bookmarkRepository.existsByUserAndDocument(user, document)) {
            throw new IllegalArgumentException("Document is already bookmarked");
        }

        Bookmark bookmark = new Bookmark();
        bookmark.setUser(user);
        bookmark.setDocument(document);
        bookmarkRepository.save(bookmark);

        return DocumentDTO.fromEntity(document);
    }

    @Transactional
    public void removeBookmark(Long documentId, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", username));

        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document", "id", documentId));

        Optional<Bookmark> bookmark = bookmarkRepository.findByUserAndDocument(user, document);
        if (bookmark.isEmpty()) {
            throw new ResourceNotFoundException("Bookmark", "documentId", documentId);
        }

        bookmarkRepository.deleteByUserAndDocument(user, document);
    }

    public List<DocumentDTO> getUserBookmarks(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", username));

        return bookmarkRepository.findByUser(user)
                .stream()
                .map(bookmark -> DocumentDTO.fromEntity(bookmark.getDocument()))
                .collect(Collectors.toList());
    }

    public boolean isBookmarked(Long documentId, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", username));

        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document", "id", documentId));

        return bookmarkRepository.existsByUserAndDocument(user, document);
    }
}
