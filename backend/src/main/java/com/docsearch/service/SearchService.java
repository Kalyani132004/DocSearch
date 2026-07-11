package com.docsearch.service;

import com.docsearch.dto.SearchResultDTO;
import com.docsearch.entity.Document;
import com.docsearch.lucene.LuceneSearcher;
import com.docsearch.repository.DocumentRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class SearchService {

    private final LuceneSearcher luceneSearcher;
    private final DocumentRepository documentRepository;
    private final HistoryService historyService;

    public SearchService(LuceneSearcher luceneSearcher,
                         DocumentRepository documentRepository,
                         HistoryService historyService) {
        this.luceneSearcher = luceneSearcher;
        this.documentRepository = documentRepository;
        this.historyService = historyService;
    }

    public Page<SearchResultDTO> search(String query, String fileType, String sortBy,
                                        int page, int size, String username) {
        // 1. Execute Lucene full-text search for up to 1000 results
        List<SearchResultDTO> luceneResults = luceneSearcher.search(query, 1000);

        // 2. Enrich results with DB metadata
        List<SearchResultDTO> enriched = luceneResults.stream()
                .map(result -> {
                    Optional<Document> docOpt = documentRepository.findById(result.getId());
                    if (docOpt.isEmpty()) return null;
                    Document doc = docOpt.get();
                    result.setTitle(doc.getTitle());
                    result.setFileName(doc.getFileName());
                    result.setFileType(doc.getFileType());
                    result.setAuthor(doc.getAuthor());
                    result.setUploadedAt(doc.getUploadedAt());
                    result.setFileSize(doc.getFileSize());
                    return result;
                })
                .filter(r -> r != null)
                .collect(Collectors.toList());

        // 3. Filter by fileType if provided
        if (fileType != null && !fileType.isBlank()) {
            enriched = enriched.stream()
                    .filter(r -> fileType.equalsIgnoreCase(r.getFileType()))
                    .collect(Collectors.toList());
        }

        // Deduplicate by title to ensure the user only sees unique real-time data
        List<SearchResultDTO> uniqueEnriched = new java.util.ArrayList<>();
        java.util.Set<String> seenTitles = new java.util.HashSet<>();
        for (SearchResultDTO r : enriched) {
            if (seenTitles.add(r.getTitle())) {
                uniqueEnriched.add(r);
            }
        }
        enriched = uniqueEnriched;

        // 4. Sort
        if (sortBy != null) {
            switch (sortBy.toLowerCase()) {
                case "newest" -> enriched.sort(
                        Comparator.comparing(SearchResultDTO::getUploadedAt,
                                Comparator.nullsLast(Comparator.reverseOrder()))
                );
                case "oldest" -> enriched.sort(
                        Comparator.comparing(SearchResultDTO::getUploadedAt,
                                Comparator.nullsLast(Comparator.naturalOrder()))
                );
                default -> {
                    // Default: sort by relevance score descending
                    enriched.sort(Comparator.comparingDouble(SearchResultDTO::getRelevanceScore).reversed());
                }
            }
        } else {
            enriched.sort(Comparator.comparingDouble(SearchResultDTO::getRelevanceScore).reversed());
        }

        // 5. Save search history asynchronously (ignore errors)
        int totalResults = enriched.size();
        try {
            historyService.saveSearch(query, totalResults, username);
        } catch (Exception e) {
            // Do not fail the search if history save fails
        }

        // 6. Apply pagination
        int fromIndex = page * size;
        int toIndex = Math.min(fromIndex + size, enriched.size());

        if (fromIndex > enriched.size()) {
            return new PageImpl<>(List.of(), PageRequest.of(page, size), enriched.size());
        }

        List<SearchResultDTO> pageContent = enriched.subList(fromIndex, toIndex);
        return new PageImpl<>(pageContent, PageRequest.of(page, size), enriched.size());
    }

    public List<String> getSuggestions(String query) {
        if (query == null || query.isBlank()) {
            return List.of();
        }
        List<Document> docs = documentRepository.searchByTitleOrAuthor(query);
        return docs.stream()
                .map(Document::getTitle)
                .distinct()
                .limit(5)
                .collect(Collectors.toList());
    }
}
