package com.docsearch.dto;

import java.time.LocalDateTime;

public class SearchResultDTO {

    private Long id;
    private String title;
    private String fileName;
    private String fileType;
    private String snippet;
    private float relevanceScore;
    private String author;
    private LocalDateTime uploadedAt;
    private Long fileSize;

    public SearchResultDTO() {}

    public SearchResultDTO(Long id, String title, String fileName, String fileType, String snippet,
                           float relevanceScore, String author, LocalDateTime uploadedAt, Long fileSize) {
        this.id = id;
        this.title = title;
        this.fileName = fileName;
        this.fileType = fileType;
        this.snippet = snippet;
        this.relevanceScore = relevanceScore;
        this.author = author;
        this.uploadedAt = uploadedAt;
        this.fileSize = fileSize;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }

    public String getFileType() { return fileType; }
    public void setFileType(String fileType) { this.fileType = fileType; }

    public String getSnippet() { return snippet; }
    public void setSnippet(String snippet) { this.snippet = snippet; }

    public float getRelevanceScore() { return relevanceScore; }
    public void setRelevanceScore(float relevanceScore) { this.relevanceScore = relevanceScore; }

    public String getAuthor() { return author; }
    public void setAuthor(String author) { this.author = author; }

    public LocalDateTime getUploadedAt() { return uploadedAt; }
    public void setUploadedAt(LocalDateTime uploadedAt) { this.uploadedAt = uploadedAt; }

    public Long getFileSize() { return fileSize; }
    public void setFileSize(Long fileSize) { this.fileSize = fileSize; }
}
