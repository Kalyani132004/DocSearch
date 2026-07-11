package com.docsearch.dto;

import com.docsearch.entity.User;

import java.time.LocalDateTime;

public record UserDTO(
        Long id,
        String username,
        String email,
        String fullName,
        String role,
        LocalDateTime createdAt
) {
    public static UserDTO fromEntity(User user) {
        return new UserDTO(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getFullName(),
                user.getRole(),
                user.getCreatedAt()
        );
    }
}
