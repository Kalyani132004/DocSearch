package com.docsearch.controller;

import com.docsearch.service.HistoryService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/history")
public class HistoryController {

    private final HistoryService historyService;

    public HistoryController(HistoryService historyService) {
        this.historyService = historyService;
    }

    @PostMapping
    public ResponseEntity<Map<String, String>> addHistory(
            @RequestBody Map<String, Object> body,
            Authentication authentication) {
        try {
            String username = authentication.getName();
            String query = (String) body.get("query");
            int resultCount = body.get("resultCount") instanceof Number
                    ? ((Number) body.get("resultCount")).intValue() : 0;
            if (query != null && !query.isBlank()) {
                historyService.saveSearch(query, resultCount, username);
            }
        } catch (Exception ignored) {}
        return ResponseEntity.ok(Map.of("message", "History saved"));
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getUserHistory(Authentication authentication) {
        String username = authentication.getName();
        List<Map<String, Object>> history = historyService.getUserHistory(username);
        return ResponseEntity.ok(history);
    }

    @DeleteMapping
    public ResponseEntity<Map<String, String>> clearHistory(Authentication authentication) {
        String username = authentication.getName();
        historyService.clearHistory(username);
        return ResponseEntity.ok(Map.of("message", "Search history cleared successfully"));
    }

    @GetMapping("/keywords")
    public ResponseEntity<List<String>> getTopKeywords(Authentication authentication) {
        String username = authentication.getName();
        List<String> keywords = historyService.getTopKeywords(username);
        return ResponseEntity.ok(keywords);
    }
}
