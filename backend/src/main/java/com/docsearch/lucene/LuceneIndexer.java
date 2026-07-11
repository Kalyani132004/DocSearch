package com.docsearch.lucene;

import org.apache.lucene.analysis.Analyzer;
import org.apache.lucene.document.Field;
import org.apache.lucene.document.StringField;
import org.apache.lucene.document.TextField;
import org.apache.lucene.index.IndexWriter;
import org.apache.lucene.index.IndexWriterConfig;
import org.apache.lucene.index.Term;
import org.apache.lucene.store.Directory;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class LuceneIndexer {

    private final Directory directory;
    private final Analyzer analyzer;

    public LuceneIndexer(Directory directory, Analyzer analyzer) {
        this.directory = directory;
        this.analyzer = analyzer;
    }

    public void indexDocument(Long docId, String title, String content, String fileType, String author) {
        IndexWriterConfig config = new IndexWriterConfig(analyzer);
        config.setOpenMode(IndexWriterConfig.OpenMode.CREATE_OR_APPEND);

        try (IndexWriter writer = new IndexWriter(directory, config)) {
            org.apache.lucene.document.Document luceneDoc = new org.apache.lucene.document.Document();

            luceneDoc.add(new StringField("id", String.valueOf(docId), Field.Store.YES));
            luceneDoc.add(new TextField("title", title != null ? title : "", Field.Store.YES));
            luceneDoc.add(new TextField("content", content != null ? content : "", Field.Store.YES));
            luceneDoc.add(new StringField("fileType", fileType != null ? fileType : "", Field.Store.YES));
            luceneDoc.add(new TextField("author", author != null ? author : "", Field.Store.YES));

            // Use updateDocument to ensure idempotency — replaces existing doc with same id
            writer.updateDocument(new Term("id", String.valueOf(docId)), luceneDoc);
            writer.commit();
        } catch (IOException e) {
            throw new RuntimeException("Failed to index document with id=" + docId, e);
        }
    }

    public void deleteDocument(Long docId) {
        IndexWriterConfig config = new IndexWriterConfig(analyzer);
        config.setOpenMode(IndexWriterConfig.OpenMode.CREATE_OR_APPEND);

        try (IndexWriter writer = new IndexWriter(directory, config)) {
            writer.deleteDocuments(new Term("id", String.valueOf(docId)));
            writer.commit();
        } catch (IOException e) {
            throw new RuntimeException("Failed to delete document from index with id=" + docId, e);
        }
    }
}
