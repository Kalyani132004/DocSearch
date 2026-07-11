package com.docsearch.util;

import org.springframework.stereotype.Component;

import java.util.Set;

@Component
public class FileUtil {

    private static final Set<String> SUPPORTED_TYPES = Set.of("pdf", "doc", "docx", "txt", "ppt", "pptx");

    public String getFileExtension(String filename) {
        if (filename == null || filename.isBlank()) {
            return "";
        }
        int lastDotIndex = filename.lastIndexOf('.');
        if (lastDotIndex == -1 || lastDotIndex == filename.length() - 1) {
            return "";
        }
        return filename.substring(lastDotIndex + 1).toLowerCase();
    }

    public String formatFileSize(Long bytes) {
        if (bytes == null || bytes < 0) {
            return "0 B";
        }
        if (bytes < 1024) {
            return bytes + " B";
        } else if (bytes < 1024 * 1024) {
            return String.format("%.2f KB", bytes / 1024.0);
        } else if (bytes < 1024L * 1024 * 1024) {
            return String.format("%.2f MB", bytes / (1024.0 * 1024));
        } else {
            return String.format("%.2f GB", bytes / (1024.0 * 1024 * 1024));
        }
    }

    public String sanitizeFilename(String filename) {
        if (filename == null) {
            return "unnamed";
        }
        // Remove path separators and other potentially dangerous characters
        return filename.replaceAll("[^a-zA-Z0-9._\\-]", "_");
    }

    public boolean isSupportedType(String extension) {
        if (extension == null) {
            return false;
        }
        return SUPPORTED_TYPES.contains(extension.toLowerCase());
    }
}
