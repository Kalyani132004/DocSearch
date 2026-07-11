package com.docsearch.controller;

import com.docsearch.dto.UserDTO;
import com.docsearch.entity.User;
import com.docsearch.exception.ResourceNotFoundException;
import com.docsearch.exception.UnauthorizedException;
import com.docsearch.repository.BookmarkRepository;
import com.docsearch.repository.SearchHistoryRepository;
import com.docsearch.repository.UserRepository;
import com.docsearch.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final BookmarkRepository bookmarkRepository;
    private final SearchHistoryRepository searchHistoryRepository;

    public UserController(UserService userService,
                          UserRepository userRepository,
                          PasswordEncoder passwordEncoder,
                          BookmarkRepository bookmarkRepository,
                          SearchHistoryRepository searchHistoryRepository) {
        this.userService = userService;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.bookmarkRepository = bookmarkRepository;
        this.searchHistoryRepository = searchHistoryRepository;
    }

    private void requireAdmin(Authentication authentication) {
        boolean isAdmin = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(a -> a.equals("ROLE_ADMIN"));
        if (!isAdmin) {
            throw new UnauthorizedException("Only administrators can perform this action");
        }
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAllUsers(Authentication authentication) {
        requireAdmin(authentication);
        List<UserDTO> users = userService.getAllUsers();
        Map<String, Object> response = new java.util.HashMap<>();
        response.put("content", users);
        response.put("totalPages", 1);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/me")
    public ResponseEntity<UserDTO> getCurrentUser(Authentication authentication) {
        String username = authentication.getName();
        UserDTO dto = userService.getCurrentUser(username);
        return ResponseEntity.ok(dto);
    }

    @PutMapping("/me")
    public ResponseEntity<UserDTO> updateCurrentUser(
            @RequestBody Map<String, String> body,
            Authentication authentication) {
        String username = authentication.getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", username));

        if (body.containsKey("fullName") && body.get("fullName") != null && !body.get("fullName").isBlank()) {
            user.setFullName(body.get("fullName"));
        }
        if (body.containsKey("email") && body.get("email") != null && !body.get("email").isBlank()) {
            user.setEmail(body.get("email"));
        }
        userRepository.save(user);
        return ResponseEntity.ok(UserDTO.fromEntity(user));
    }

    @PutMapping("/me/password")
    public ResponseEntity<Map<String, String>> changePassword(
            @RequestBody Map<String, String> body,
            Authentication authentication) {
        String username = authentication.getName();
        String currentPassword = body.get("currentPassword");
        String newPassword = body.get("newPassword");

        if (currentPassword == null || newPassword == null || newPassword.length() < 6) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid password data"));
        }

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", username));

        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Current password is incorrect"));
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "Password changed successfully"));
    }

    @GetMapping("/me/stats")
    public ResponseEntity<Map<String, Object>> getMyStats(Authentication authentication) {
        String username = authentication.getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", username));

        long uploads = userRepository.countDocumentsByUser(user.getId());
        long searches = searchHistoryRepository.countByUser(user);
        long bookmarks = bookmarkRepository.countByUser(user);

        return ResponseEntity.ok(Map.of(
                "uploads", uploads,
                "searches", searches,
                "bookmarks", bookmarks
        ));
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserDTO> getUserById(
            @PathVariable Long id,
            Authentication authentication) {
        requireAdmin(authentication);
        UserDTO dto = userService.getUserById(id);
        return ResponseEntity.ok(dto);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteUser(
            @PathVariable Long id,
            Authentication authentication) {
        requireAdmin(authentication);
        userService.deleteUser(id);
        return ResponseEntity.ok(Map.of("message", "User deleted successfully"));
    }
}
