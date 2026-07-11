package com.docsearch.dto;

import com.docsearch.entity.Document;

import java.time.LocalDateTime;

public record DocumentDTO(
        Long id,
        String title,
        String fileName,
        String fileType,
        Long fileSize,
        String author,
        String uploadedBy,
        LocalDateTime uploadedAt,
        Integer downloadCount
) {
    public static DocumentDTO fromEntity(Document doc) {
        String uploader = doc.getUploadedBy() != null ? doc.getUploadedBy().getUsername() : null;
        return new DocumentDTO(
                doc.getId(),
                doc.getTitle(),
                doc.getFileName(),
                doc.getFileType(),
                doc.getFileSize(),
                doc.getAuthor(),
                uploader,
                doc.getUploadedAt(),
                doc.getDownloadCount()
        );
    }
}
