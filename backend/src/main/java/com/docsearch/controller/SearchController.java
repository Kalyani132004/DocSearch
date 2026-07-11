package com.docsearch.controller;

import com.docsearch.dto.SearchResultDTO;
import com.docsearch.service.SearchService;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/search")
public class SearchController {

    private final SearchService searchService;

    public SearchController(SearchService searchService) {
        this.searchService = searchService;
    }

    @GetMapping
    public ResponseEntity<java.util.Map<String, Object>> search(
            @RequestParam(name = "q") String query,
            @RequestParam(required = false) String fileType,
            @RequestParam(required = false, defaultValue = "relevance") String sortBy,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication authentication) {

        String username = authentication != null ? authentication.getName() : "anonymous";
        Page<SearchResultDTO> results = searchService.search(query, fileType, sortBy, page, size, username);
        
        java.util.Map<String, Object> response = new java.util.HashMap<>();
        response.put("content", results.getContent());
        response.put("value", results.getContent()); // FOR CACHED BROWSERS
        response.put("totalElements", results.getTotalElements());
        response.put("totalPages", results.getTotalPages());
        response.put("size", results.getSize());
        response.put("number", results.getNumber());
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/suggestions")
    public ResponseEntity<List<String>> getSuggestions(@RequestParam(name = "q") String query) {
        List<String> suggestions = searchService.getSuggestions(query);
        return ResponseEntity.ok(suggestions);
    }

    @GetMapping("/debugSearch")
    public ResponseEntity<String> debugSearch(@RequestParam String q) {
        try {
            java.util.List<SearchResultDTO> luceneResults = searchService.search(q, null, null, 0, 10, "admin").getContent();
            return ResponseEntity.ok("Success: " + luceneResults.size() + " results.");
        } catch (Exception e) {
            java.io.StringWriter sw = new java.io.StringWriter();
            e.printStackTrace(new java.io.PrintWriter(sw));
            return ResponseEntity.ok("Error: " + e.getMessage() + "\n" + sw.toString());
        }
    }

    @GetMapping("/dump")
    public ResponseEntity<?> dumpIndex() {
        try {
            org.apache.lucene.store.Directory dir = org.apache.lucene.store.FSDirectory.open(java.nio.file.Path.of("lucene-index"));
            org.apache.lucene.index.DirectoryReader reader = org.apache.lucene.index.DirectoryReader.open(dir);
            java.util.List<java.util.Map<String, String>> docs = new java.util.ArrayList<>();
            for (int i = 0; i < reader.maxDoc(); i++) {
                org.apache.lucene.document.Document doc = reader.storedFields().document(i);
                java.util.Map<String, String> map = new java.util.HashMap<>();
                for (org.apache.lucene.index.IndexableField field : doc.getFields()) {
                    map.put(field.name(), field.stringValue());
                }
                docs.add(map);
            }
            reader.close();
            return ResponseEntity.ok(docs);
        } catch (Throwable e) {
            java.io.StringWriter sw = new java.io.StringWriter();
            e.printStackTrace(new java.io.PrintWriter(sw));
            return ResponseEntity.status(500).body("Error: " + sw.toString());
        }
    }
}
