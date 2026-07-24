package com.docsearch.service;

import com.docsearch.dto.DocumentDTO;
import com.docsearch.repository.BookmarkRepository;
import org.springframework.transaction.annotation.Transactional;
import com.docsearch.entity.Document;
import com.docsearch.entity.User;
import com.docsearch.exception.ResourceNotFoundException;
import com.docsearch.lucene.LuceneIndexer;
import com.docsearch.parser.DocumentParser;
import com.docsearch.repository.BookmarkRepository;
import com.docsearch.repository.DocumentRepository;
import com.docsearch.repository.UserRepository;
import com.docsearch.util.FileUtil;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
public class DocumentService {

    @Value("${file.upload-dir}")
    private String uploadDir;

    private final DocumentRepository documentRepository;
    private final UserRepository userRepository;
    private final DocumentParser documentParser;
    private final LuceneIndexer luceneIndexer;
    private final FileUtil fileUtil;
    private final BookmarkRepository bookmarkRepository;

    public DocumentService(DocumentRepository documentRepository,
                           UserRepository userRepository,
                           DocumentParser documentParser,
                           LuceneIndexer luceneIndexer,
                           FileUtil fileUtil,
                           BookmarkRepository bookmarkRepository) {
        this.documentRepository = documentRepository;
        this.userRepository = userRepository;
        this.documentParser = documentParser;
        this.luceneIndexer = luceneIndexer;
        this.fileUtil = fileUtil;
        this.bookmarkRepository = bookmarkRepository;
    }

    @jakarta.annotation.PostConstruct
    public void syncIndex() {
        System.out.println("Syncing Lucene Index with Database...");
        long count = 0;
        for (Document doc : documentRepository.findAll()) {
            try {
                luceneIndexer.indexDocument(doc.getId(), doc.getTitle(), doc.getContent(), doc.getFileType(), doc.getAuthor());
                count++;
            } catch (Exception e) {
                System.err.println("Failed to index doc " + doc.getId());
            }
        }
        System.out.println("Successfully indexed " + count + " documents.");
    }

    public DocumentDTO uploadDocument(MultipartFile file, String username) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File must not be empty");
        }

        String originalFilename = file.getOriginalFilename();
        String extension = fileUtil.getFileExtension(originalFilename);

        if (!fileUtil.isSupportedType(extension)) {
            throw new IllegalArgumentException(
                    "Unsupported file type: " + extension + ". Supported types: pdf, doc, docx, txt, ppt, pptx"
            );
        }

        User uploader = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", username));

        // Build safe file path
        String sanitizedFilename = fileUtil.sanitizeFilename(originalFilename);
        String storedFilename = UUID.randomUUID() + "_" + sanitizedFilename;
        Path userDir = Paths.get(uploadDir, username);
        Files.createDirectories(userDir);
        Path filePath = userDir.resolve(storedFilename);

        // Save file to disk
        try (InputStream is = file.getInputStream()) {
            Files.copy(is, filePath, StandardCopyOption.REPLACE_EXISTING);
        }

        // Parse document content
        String content = "";
        try (InputStream is = file.getInputStream()) {
            content = documentParser.parse(extension, is);
            if (content != null) {
                content = content.replace("\u0000", "");
            }
        } catch (Exception e) {
            // Content extraction failure should not block upload
            content = "";
        }

        // Build title from original filename (strip extension)
        String title = originalFilename;
        int dotIdx = originalFilename.lastIndexOf('.');
        if (dotIdx > 0) {
            title = originalFilename.substring(0, dotIdx);
        }

        // Persist document entity
        Document document = new Document();
        document.setTitle(title);
        document.setFileName(originalFilename);
        document.setFilePath(filePath.toString());
        document.setFileType(extension);
        document.setFileSize(file.getSize());
        document.setContent(content);
        document.setAuthor(uploader.getFullName());
        document.setUploadedBy(uploader);
        document.setDownloadCount(0);

        Document saved = documentRepository.save(document);

        // Index in Lucene
        try {
            luceneIndexer.indexDocument(saved.getId(), saved.getTitle(), saved.getContent(),
                    saved.getFileType(), saved.getAuthor());
        } catch (Exception e) {
            // Indexing failure should not break the upload
            System.err.println("Warning: Lucene indexing failed for document id=" + saved.getId() + ": " + e.getMessage());
        }

        return DocumentDTO.fromEntity(saved);
    }

    public Page<DocumentDTO> getAllDocuments(String username, int page, int size) {

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", username));

        System.out.println("=================================");
        System.out.println("Username : " + user.getUsername());
        System.out.println("Role     : " + user.getRole());
        System.out.println("User Id  : " + user.getId());
        System.out.println("=================================");

        Pageable pageable = PageRequest.of(page, size,
                Sort.by("uploadedAt").descending());

        if ("ADMIN".equalsIgnoreCase(user.getRole())) {

            System.out.println("ADMIN QUERY EXECUTED");

            return documentRepository.findAllByOrderByUploadedAtDesc(pageable)
                    .map(DocumentDTO::fromEntity);
        }

        System.out.println("USER QUERY EXECUTED");

        Page<Document> docs =
                documentRepository.findVisibleDocuments(user.getId(), pageable);

        System.out.println("Documents Found : " + docs.getTotalElements());

        docs.forEach(d -> System.out.println(
                d.getId() + " -> " +
                d.getTitle() + " -> " +
                d.getUploadedBy().getUsername() + " -> " +
                d.getUploadedBy().getRole()
        ));

        return docs.map(DocumentDTO::fromEntity);
    }
    public Page<DocumentDTO> getDocumentsByUser(String username, int page, int size) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", username));

        Pageable pageable = PageRequest.of(page, size, Sort.by("uploadedAt").descending());
        return documentRepository.findByUploadedBy(user, pageable).map(DocumentDTO::fromEntity);
    }

    public DocumentDTO getDocumentById(Long id) {

        Document doc = documentRepository.findById(id)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Document", "id", id));

        return DocumentDTO.fromEntity(doc);
    }


    public void downloadDocument(Long id, HttpServletResponse response) throws IOException {

        Document doc = documentRepository.findById(id)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Document", "id", id));

        Path filePath = Paths.get(doc.getFilePath());

        if (!Files.exists(filePath)) {
            throw new ResourceNotFoundException("File", "path", doc.getFilePath());
        }

        doc.setDownloadCount(doc.getDownloadCount() + 1);
        documentRepository.save(doc);

        response.setContentType(getContentType(doc.getFileType()));
        response.setHeader("Content-Disposition",
                "attachment; filename=\"" + doc.getFileName() + "\"");

        response.setContentLengthLong(doc.getFileSize());

        try (OutputStream os = response.getOutputStream()) {
            Files.copy(filePath, os);
            os.flush();
        }
    }


    @Transactional
    public void deleteDocument(Long id, String username) {

        Document doc = documentRepository.findById(id)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Document", "id", id));

        // Find current user
        User currentUser = userRepository.findByUsername(username)
                .orElseThrow(() ->
                        new ResourceNotFoundException("User", "username", username));

     
        if ("USER".equalsIgnoreCase(currentUser.getRole())) {

            if (!doc.getUploadedBy().getId().equals(currentUser.getId())) {
                throw new RuntimeException("You are not allowed to delete this document.");
            }
        }

  
        try {
            Files.deleteIfExists(Paths.get(doc.getFilePath()));
        } catch (IOException e) {
            System.err.println("File delete failed: " + e.getMessage());
        }

        // Delete from Lucene index
        try {
            luceneIndexer.deleteDocument(id);
        } catch (Exception e) {
            System.err.println("Lucene delete failed: " + e.getMessage());
        }

    
        bookmarkRepository.deleteByDocumentId(id);


        documentRepository.delete(doc);
    }



    private String getContentType(String fileType) {
        if (fileType == null) return "application/octet-stream";
        return switch (fileType.toLowerCase()) {
            case "pdf" -> "application/pdf";
            case "doc" -> "application/msword";
            case "docx" -> "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            case "txt" -> "text/plain";
            case "ppt" -> "application/vnd.ms-powerpoint";
            case "pptx" -> "application/vnd.openxmlformats-officedocument.presentationml.presentation";
            default -> "application/octet-stream";
        };
    }
}
