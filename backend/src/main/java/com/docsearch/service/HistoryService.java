package com.docsearch.service;

import com.docsearch.entity.SearchHistory;
import com.docsearch.entity.User;
import com.docsearch.exception.ResourceNotFoundException;
import com.docsearch.repository.SearchHistoryRepository;
import com.docsearch.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class HistoryService {

    private final SearchHistoryRepository searchHistoryRepository;
    private final UserRepository userRepository;

    public HistoryService(SearchHistoryRepository searchHistoryRepository, UserRepository userRepository) {
        this.searchHistoryRepository = searchHistoryRepository;
        this.userRepository = userRepository;
    }

    public void saveSearch(String query, int resultCount, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", username));

        SearchHistory history = new SearchHistory();
        history.setUser(user);
        history.setQuery(query);
        history.setResultCount(resultCount);
        history.setSearchedAt(LocalDateTime.now());
        searchHistoryRepository.save(history);
    }

    public List<Map<String, Object>> getUserHistory(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", username));

        List<SearchHistory> histories = searchHistoryRepository.findByUserOrderBySearchedAtDesc(user);
        List<Map<String, Object>> result = new ArrayList<>();

        for (SearchHistory h : histories) {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("id", h.getId());
            entry.put("query", h.getQuery());
            entry.put("searchQuery", h.getQuery()); // FOR CACHED BROWSERS
            entry.put("resultCount", h.getResultCount());
            entry.put("searchedAt", h.getSearchedAt() != null ? h.getSearchedAt().toString() : null);
            result.add(entry);
        }

        return result;
    }

    @Transactional
    public void clearHistory(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", username));
        searchHistoryRepository.deleteByUser(user);
    }

    public List<String> getTopKeywords(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", username));

        List<Object[]> rows = searchHistoryRepository.findTopKeywordsByUser(user.getId());
        List<String> result = new ArrayList<>();

        for (Object[] row : rows) {
            if (row[0] != null) {
                result.add(row[0].toString());
            }
        }

        return result;
    }
}
