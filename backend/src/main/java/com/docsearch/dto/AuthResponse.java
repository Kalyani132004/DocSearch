package com.docsearch.dto;

public record AuthResponse(
        String token,
        String username,
        String email,
        String role,
        String fullName,
        Long id
) {}
