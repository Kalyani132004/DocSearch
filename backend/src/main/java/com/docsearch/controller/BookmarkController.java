package com.docsearch.controller;

import com.docsearch.dto.DocumentDTO;
import com.docsearch.service.BookmarkService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bookmarks")
public class BookmarkController {

    private final BookmarkService bookmarkService;

    public BookmarkController(BookmarkService bookmarkService) {
        this.bookmarkService = bookmarkService;
    }

    @PostMapping
    public ResponseEntity<DocumentDTO> addBookmark(
            @RequestParam Long documentId,
            Authentication authentication) {
        String username = authentication.getName();
        DocumentDTO dto = bookmarkService.addBookmark(documentId, username);
        return ResponseEntity.ok(dto);
    }

    @DeleteMapping("/{documentId}")
    public ResponseEntity<Map<String, String>> removeBookmark(
            @PathVariable Long documentId,
            Authentication authentication) {
        String username = authentication.getName();
        bookmarkService.removeBookmark(documentId, username);
        return ResponseEntity.ok(Map.of("message", "Bookmark removed successfully"));
    }

    @GetMapping
    public ResponseEntity<List<DocumentDTO>> getUserBookmarks(Authentication authentication) {
        String username = authentication.getName();
        List<DocumentDTO> bookmarks = bookmarkService.getUserBookmarks(username);
        return ResponseEntity.ok(bookmarks);
    }

    @GetMapping("/check/{documentId}")
    public ResponseEntity<Map<String, Boolean>> isBookmarked(
            @PathVariable Long documentId,
            Authentication authentication) {
        String username = authentication.getName();
        boolean bookmarked = bookmarkService.isBookmarked(documentId, username);
        return ResponseEntity.ok(Map.of("bookmarked", bookmarked));
    }
}
