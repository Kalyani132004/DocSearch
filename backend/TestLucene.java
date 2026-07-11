import java.nio.file.Path;
import org.apache.lucene.analysis.standard.StandardAnalyzer;
import org.apache.lucene.index.DirectoryReader;
import org.apache.lucene.queryparser.classic.MultiFieldQueryParser;
import org.apache.lucene.queryparser.classic.QueryParser;
import org.apache.lucene.search.IndexSearcher;
import org.apache.lucene.search.Query;
import org.apache.lucene.search.TopDocs;
import org.apache.lucene.store.FSDirectory;

public class TestLucene {
    public static void main(String[] args) throws Exception {
        FSDirectory dir = FSDirectory.open(Path.of("lucene-index"));
        DirectoryReader reader = DirectoryReader.open(dir);
        IndexSearcher searcher = new IndexSearcher(reader);
        
        String queryStr = "Servlet";
        String[] tokens = queryStr.toLowerCase().trim().split("\\s+");
        StringBuilder wildcardQuery = new StringBuilder();
        for (String token : tokens) {
            wildcardQuery.append(QueryParser.escape(token)).append("* ");
        }
        
        System.out.println("Wildcard Query String: " + wildcardQuery.toString().trim());
        
        String[] fields = {"title", "content", "author"};
        StandardAnalyzer analyzer = new StandardAnalyzer();
        MultiFieldQueryParser parser = new MultiFieldQueryParser(fields, analyzer);
        parser.setDefaultOperator(QueryParser.Operator.OR);
        
        Query query = parser.parse(wildcardQuery.toString().trim());
        System.out.println("Parsed Query: " + query.toString());
        
        TopDocs docs = searcher.search(query, 10);
        System.out.println("Total hits: " + docs.totalHits.value);
        
        reader.close();
    }
}
