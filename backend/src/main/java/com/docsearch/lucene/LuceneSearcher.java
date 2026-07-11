package com.docsearch.lucene;

import com.docsearch.dto.SearchResultDTO;
import org.apache.lucene.analysis.Analyzer;
import org.apache.lucene.index.DirectoryReader;
import org.apache.lucene.index.IndexReader;
import org.apache.lucene.queryparser.classic.MultiFieldQueryParser;
import org.apache.lucene.queryparser.classic.ParseException;
import org.apache.lucene.queryparser.classic.QueryParser;
import org.apache.lucene.search.IndexSearcher;
import org.apache.lucene.search.Query;
import org.apache.lucene.search.ScoreDoc;
import org.apache.lucene.search.TopDocs;
import org.apache.lucene.search.highlight.*;
import org.apache.lucene.store.Directory;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Component
public class LuceneSearcher {

    private final Directory directory;
    private final Analyzer analyzer;

    public LuceneSearcher(Directory directory, Analyzer analyzer) {
        this.directory = directory;
        this.analyzer = analyzer;
    }

    public List<SearchResultDTO> search(String queryStr, int maxResults) {
        List<SearchResultDTO> results = new ArrayList<>();

        if (queryStr == null || queryStr.isBlank()) {
            return results;
        }

        try {
            if (!DirectoryReader.indexExists(directory)) {
                return results;
            }
        } catch (IOException e) {
            return results;
        }

        try (IndexReader reader = DirectoryReader.open(directory)) {
            IndexSearcher searcher = new IndexSearcher(reader);
            String[] fields = {"title", "content", "author"};
            
            MultiFieldQueryParser parser = new MultiFieldQueryParser(fields, analyzer);
            parser.setDefaultOperator(QueryParser.Operator.OR);

            // Lowercase the query because QueryParser does not analyze wildcard terms, 
            // and we need to match the lowercased terms in the index produced by StandardAnalyzer.
            String[] tokens = queryStr.toLowerCase().trim().split("\\s+");
            StringBuilder wildcardQuery = new StringBuilder();
            for (String token : tokens) {
                // Escape special characters and append wildcard for prefix matching
                wildcardQuery.append(QueryParser.escape(token)).append("* ");
            }

            Query query;
            try {
                query = parser.parse(wildcardQuery.toString().trim());
            } catch (ParseException e) {
                try {
                    query = parser.parse(QueryParser.escape(queryStr));
                } catch (ParseException ex) {
                    return results;
                }
            }

            TopDocs topDocs = searcher.search(query, maxResults);

            // Highlighter setup
            QueryScorer scorer = new QueryScorer(query, "content");
            Highlighter highlighter = new Highlighter(new SimpleHTMLFormatter("<mark>", "</mark>"), scorer);
            highlighter.setTextFragmenter(new SimpleSpanFragmenter(scorer, 200));

            for (ScoreDoc scoreDoc : topDocs.scoreDocs) {
                org.apache.lucene.document.Document doc = searcher.storedFields().document(scoreDoc.doc);

                String idStr = doc.get("id");
                if (idStr == null) continue;

                Long id = Long.parseLong(idStr);
                String title = doc.get("title");
                String fileType = doc.get("fileType");
                String author = doc.get("author");
                String content = doc.get("content");

                String snippet = "";
                if (content != null && !content.isBlank()) {
                    try {
                        String[] fragments = highlighter.getBestFragments(analyzer, "content", content, 3);
                        if (fragments != null && fragments.length > 0) {
                            snippet = String.join(" ... ", fragments);
                        } else {
                            snippet = content.length() > 300 ? content.substring(0, 300) + "..." : content;
                        }
                    } catch (InvalidTokenOffsetsException e) {
                        snippet = content.length() > 300 ? content.substring(0, 300) + "..." : content;
                    }
                }

                SearchResultDTO result = new SearchResultDTO();
                result.setId(id);
                result.setTitle(title);
                result.setFileType(fileType);
                result.setAuthor(author);
                result.setSnippet(snippet);
                result.setRelevanceScore(scoreDoc.score);

                results.add(result);
            }

        } catch (IOException e) {
            throw new RuntimeException("Error executing Lucene search", e);
        }

        return results;
    }
}
