package com.docsearch.config;

import org.apache.lucene.analysis.Analyzer;
import org.apache.lucene.analysis.standard.StandardAnalyzer;
import org.apache.lucene.store.Directory;
import org.apache.lucene.store.FSDirectory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

@Configuration
public class LuceneConfig {

    @Value("${lucene.index-dir}")
    private String luceneIndexDir;

    @Bean
    public Directory luceneDirectory() throws IOException {
        Path indexPath = Path.of(luceneIndexDir);
        if (!Files.exists(indexPath)) {
            Files.createDirectories(indexPath);
        }
        
        Path lockPath = indexPath.resolve("write.lock");
        if (Files.exists(lockPath)) {
            try {
                Files.delete(lockPath);
                System.out.println("Removed stale Lucene write.lock file.");
            } catch (IOException e) {
                System.err.println("Failed to remove stale write.lock file: " + e.getMessage());
            }
        }
        
        return FSDirectory.open(indexPath);
    }

    @Bean
    public Analyzer luceneAnalyzer() {
        return new StandardAnalyzer();
    }
}
