package com.docsearch;

import org.apache.lucene.document.Document;
import org.apache.lucene.index.DirectoryReader;
import org.apache.lucene.index.IndexableField;
import org.apache.lucene.store.Directory;
import org.apache.lucene.store.FSDirectory;

import java.nio.file.Path;

public class TestLucene {
    public static void main(String[] args) throws Exception {
        Directory dir = FSDirectory.open(Path.of("lucene-index"));
        DirectoryReader reader = DirectoryReader.open(dir);
        System.out.println("Total docs in index: " + reader.maxDoc());
        for (int i = 0; i < reader.maxDoc(); i++) {
            Document doc = reader.storedFields().document(i);
            System.out.println("Doc " + i + ":");
            for (IndexableField field : doc.getFields()) {
                System.out.println("  " + field.name() + ": " + field.stringValue());
            }
        }
        reader.close();
    }
}
