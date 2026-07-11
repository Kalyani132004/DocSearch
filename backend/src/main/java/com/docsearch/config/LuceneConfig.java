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
        return FSDirectory.open(indexPath);
    }

    @Bean
    public Analyzer luceneAnalyzer() {
        return new StandardAnalyzer();
    }
}
