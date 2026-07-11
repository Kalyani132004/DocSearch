package com.docsearch.dto;

import java.util.List;
import java.util.Map;

public class AnalyticsDTO {

    private long totalDocuments;
    private long totalUsers;
    private long totalSearches;
    private long uploadedToday;
    private long bookmarkedDocuments;
    private Map<String, Long> documentsByType;
    private List<Map<String, Object>> dailyUploads;
    private List<Map<String, Object>> monthlyUploads;
    private List<Map<String, Object>> topSearchKeywords;

    public AnalyticsDTO() {}

    private AnalyticsDTO(Builder builder) {
        this.totalDocuments = builder.totalDocuments;
        this.totalUsers = builder.totalUsers;
        this.totalSearches = builder.totalSearches;
        this.uploadedToday = builder.uploadedToday;
        this.bookmarkedDocuments = builder.bookmarkedDocuments;
        this.documentsByType = builder.documentsByType;
        this.dailyUploads = builder.dailyUploads;
        this.monthlyUploads = builder.monthlyUploads;
        this.topSearchKeywords = builder.topSearchKeywords;
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private long totalDocuments;
        private long totalUsers;
        private long totalSearches;
        private long uploadedToday;
        private long bookmarkedDocuments;
        private Map<String, Long> documentsByType;
        private List<Map<String, Object>> dailyUploads;
        private List<Map<String, Object>> monthlyUploads;
        private List<Map<String, Object>> topSearchKeywords;

        public Builder totalDocuments(long totalDocuments) { this.totalDocuments = totalDocuments; return this; }
        public Builder totalUsers(long totalUsers) { this.totalUsers = totalUsers; return this; }
        public Builder totalSearches(long totalSearches) { this.totalSearches = totalSearches; return this; }
        public Builder uploadedToday(long uploadedToday) { this.uploadedToday = uploadedToday; return this; }
        public Builder bookmarkedDocuments(long bookmarkedDocuments) { this.bookmarkedDocuments = bookmarkedDocuments; return this; }
        public Builder documentsByType(Map<String, Long> documentsByType) { this.documentsByType = documentsByType; return this; }
        public Builder dailyUploads(List<Map<String, Object>> dailyUploads) { this.dailyUploads = dailyUploads; return this; }
        public Builder monthlyUploads(List<Map<String, Object>> monthlyUploads) { this.monthlyUploads = monthlyUploads; return this; }
        public Builder topSearchKeywords(List<Map<String, Object>> topSearchKeywords) { this.topSearchKeywords = topSearchKeywords; return this; }

        public AnalyticsDTO build() { return new AnalyticsDTO(this); }
    }

    public long getTotalDocuments() { return totalDocuments; }
    public void setTotalDocuments(long totalDocuments) { this.totalDocuments = totalDocuments; }

    public long getTotalUsers() { return totalUsers; }
    public void setTotalUsers(long totalUsers) { this.totalUsers = totalUsers; }

    public long getTotalSearches() { return totalSearches; }
    public void setTotalSearches(long totalSearches) { this.totalSearches = totalSearches; }

    public long getUploadedToday() { return uploadedToday; }
    public void setUploadedToday(long uploadedToday) { this.uploadedToday = uploadedToday; }

    public long getBookmarkedDocuments() { return bookmarkedDocuments; }
    public void setBookmarkedDocuments(long bookmarkedDocuments) { this.bookmarkedDocuments = bookmarkedDocuments; }

    public Map<String, Long> getDocumentsByType() { return documentsByType; }
    public void setDocumentsByType(Map<String, Long> documentsByType) { this.documentsByType = documentsByType; }

    public Map<String, Long> getFileTypeDistribution() { return documentsByType; }

    public List<Map<String, Object>> getDailyUploads() { return dailyUploads; }
    public void setDailyUploads(List<Map<String, Object>> dailyUploads) { this.dailyUploads = dailyUploads; }

    public List<Map<String, Object>> getMonthlyUploads() { return monthlyUploads; }
    public void setMonthlyUploads(List<Map<String, Object>> monthlyUploads) { this.monthlyUploads = monthlyUploads; }

    public List<Map<String, Object>> getTopSearchKeywords() { return topSearchKeywords; }
    public void setTopSearchKeywords(List<Map<String, Object>> topSearchKeywords) { this.topSearchKeywords = topSearchKeywords; }
}
