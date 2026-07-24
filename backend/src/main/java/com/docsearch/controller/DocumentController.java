package com.docsearch.controller;

import com.docsearch.dto.DocumentDTO;
import com.docsearch.service.DocumentService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/documents")
public class DocumentController {

    private final DocumentService documentService;

    public DocumentController(DocumentService documentService) {
        this.documentService = documentService;
    }

    @PostMapping("/upload")
    public ResponseEntity<DocumentDTO> uploadDocument(
            @RequestParam("file") MultipartFile file,
            Authentication authentication) throws IOException {
        String username = authentication.getName();
        DocumentDTO dto = documentService.uploadDocument(file, username);
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    @GetMapping
    public ResponseEntity<Page<DocumentDTO>> getAllDocuments(
            Authentication authentication,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        String username = authentication.getName();

        Page<DocumentDTO> documents =
                documentService.getAllDocuments(username, page, size);

        return ResponseEntity.ok(documents);
    }

    @GetMapping("/{id}")
    public ResponseEntity<DocumentDTO> getDocumentById(@PathVariable Long id) {
        DocumentDTO dto = documentService.getDocumentById(id);
        return ResponseEntity.ok(dto);
    }

    @GetMapping("/download/{id}")
    public void downloadDocument(@PathVariable Long id, HttpServletResponse response) throws IOException {
        documentService.downloadDocument(id, response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteDocument(
            @PathVariable Long id,
            Authentication authentication) {

        String username = authentication.getName();

        documentService.deleteDocument(id, username);

        return ResponseEntity.ok(Map.of("message", "Document deleted successfully"));
    }

    @GetMapping("/my")
    public ResponseEntity<Page<DocumentDTO>> getMyDocuments(
            Authentication authentication,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        String username = authentication.getName();
        Page<DocumentDTO> documents = documentService.getDocumentsByUser(username, page, size);
        return ResponseEntity.ok(documents);
    }
}
