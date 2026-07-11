package com.docsearch.service;

import com.docsearch.dto.AnalyticsDTO;
import com.docsearch.entity.Document;
import com.docsearch.repository.BookmarkRepository;
import com.docsearch.repository.DocumentRepository;
import com.docsearch.repository.SearchHistoryRepository;
import com.docsearch.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class AnalyticsService {

    private final DocumentRepository documentRepository;
    private final UserRepository userRepository;
    private final SearchHistoryRepository searchHistoryRepository;
    private final BookmarkRepository bookmarkRepository;

    public AnalyticsService(DocumentRepository documentRepository,
                            UserRepository userRepository,
                            SearchHistoryRepository searchHistoryRepository,
                            BookmarkRepository bookmarkRepository) {
        this.documentRepository = documentRepository;
        this.userRepository = userRepository;
        this.searchHistoryRepository = searchHistoryRepository;
        this.bookmarkRepository = bookmarkRepository;
    }

    public AnalyticsDTO getAnalytics() {
        long totalDocuments = documentRepository.count();
        long totalUsers = userRepository.count();
        long totalSearches = searchHistoryRepository.count();
        long bookmarkedDocuments = bookmarkRepository.count();

        // Uploaded today
        LocalDateTime todayStart = LocalDate.now().atStartOfDay();
        LocalDateTime todayEnd = LocalDate.now().atTime(23, 59, 59);
        long uploadedToday = documentRepository.countByUploadedAtBetween(todayStart, todayEnd);

        // Documents by file type
        Map<String, Long> documentsByType = new LinkedHashMap<>();
        List<Object[]> typeGroups = documentRepository.countGroupByFileType();
        for (Object[] row : typeGroups) {
            String fileType = row[0] != null ? (String) row[0] : "unknown";
            Long count = (Long) row[1];
            documentsByType.put(fileType, count);
        }

        // Daily uploads: last 7 days
        List<Map<String, Object>> dailyUploads = new ArrayList<>();
        DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        for (int i = 6; i >= 0; i--) {
            LocalDate date = LocalDate.now().minusDays(i);
            LocalDateTime start = date.atStartOfDay();
            LocalDateTime end = date.atTime(23, 59, 59);
            long count = documentRepository.countByUploadedAtBetween(start, end);
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("date", date.format(dateFormatter));
            entry.put("count", count);
            dailyUploads.add(entry);
        }

        // Monthly uploads: last 12 months
        List<Map<String, Object>> monthlyUploads = new ArrayList<>();
        DateTimeFormatter monthFormatter = DateTimeFormatter.ofPattern("yyyy-MM");
        for (int i = 11; i >= 0; i--) {
            LocalDate monthStart = LocalDate.now().withDayOfMonth(1).minusMonths(i);
            LocalDate monthEnd = monthStart.withDayOfMonth(monthStart.lengthOfMonth());
            long count = documentRepository.countByUploadedAtBetween(
                    monthStart.atStartOfDay(), monthEnd.atTime(23, 59, 59)
            );
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("month", monthStart.format(monthFormatter));
            entry.put("count", count);
            monthlyUploads.add(entry);
        }

        // Top search keywords (global)
        List<Map<String, Object>> topSearchKeywords = new ArrayList<>();
        List<Object[]> keywordRows = searchHistoryRepository.findTopKeywords();
        for (Object[] row : keywordRows) {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("keyword", row[0]);
            entry.put("count", row[1]);
            topSearchKeywords.add(entry);
        }

        return AnalyticsDTO.builder()
                .totalDocuments(totalDocuments)
                .totalUsers(totalUsers)
                .totalSearches(totalSearches)
                .uploadedToday(uploadedToday)
                .bookmarkedDocuments(bookmarkedDocuments)
                .documentsByType(documentsByType)
                .dailyUploads(dailyUploads)
                .monthlyUploads(monthlyUploads)
                .topSearchKeywords(topSearchKeywords)
                .build();
    }
}
