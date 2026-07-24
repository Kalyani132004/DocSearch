package com.docsearch.service;

import com.docsearch.dto.UserDTO;
import com.docsearch.entity.User;
import com.docsearch.exception.ResourceNotFoundException;
import com.docsearch.exception.UnauthorizedException;
import com.docsearch.lucene.LuceneIndexer;
import com.docsearch.repository.BookmarkRepository;
import com.docsearch.repository.DocumentRepository;
import com.docsearch.repository.SearchHistoryRepository;
import com.docsearch.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.docsearch.entity.Document;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final BookmarkRepository bookmarkRepository;
    private final SearchHistoryRepository searchHistoryRepository;
    private final DocumentRepository documentRepository;
    private final LuceneIndexer luceneIndexer;

    public UserService(UserRepository userRepository, BookmarkRepository bookmarkRepository, 
        SearchHistoryRepository searchHistoryRepository, DocumentRepository documentRepository, LuceneIndexer luceneIndexer) {
        this.userRepository = userRepository;
        this.bookmarkRepository = bookmarkRepository;
        this.searchHistoryRepository = searchHistoryRepository;
        this.documentRepository = documentRepository;
        this.luceneIndexer = luceneIndexer;
        
    }

    public List<UserDTO> getAllUsers() {
        return userRepository.findAll()
                .stream()
                .map(UserDTO::fromEntity)
                .collect(Collectors.toList());
    }

    public UserDTO getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
        return UserDTO.fromEntity(user);
    }

    public UserDTO getUserByUsername(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", username));
        return UserDTO.fromEntity(user);
    }

    @Transactional
    public void deleteUser(Long id) {

        User user = userRepository.findById(id)
                .orElseThrow(() ->
                        new ResourceNotFoundException("User", "id", id));

        // Prevent deleting last admin
        if ("ADMIN".equalsIgnoreCase(user.getRole())) {

            List<User> admins = userRepository.findByRole("ADMIN");

            if (admins.size() <= 1) {
                throw new UnauthorizedException("Cannot delete the last admin user");
            }
        }

       
        bookmarkRepository.deleteByUserId(id);

       
        searchHistoryRepository.deleteByUserId(id);
        List<Document> docs = documentRepository.findByUploadedBy(user);

        for (Document doc : docs) {

            bookmarkRepository.deleteByDocumentId(doc.getId());

            try {
                Files.deleteIfExists(Paths.get(doc.getFilePath()));
            } catch (IOException ignored) {}

            try {
                luceneIndexer.deleteDocument(doc.getId());
            } catch (Exception ignored) {}

            documentRepository.delete(doc);
        }

    
        userRepository.delete(user);
    }

    public UserDTO getCurrentUser(String username) {
        return getUserByUsername(username);
    }
}
