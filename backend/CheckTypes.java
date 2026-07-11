import java.sql.*;
public class CheckTypes {
    public static void main(String[] args) throws Exception {
        try (Connection conn = DriverManager.getConnection("jdbc:postgresql://localhost:5432/docsearch_db", "postgres", "postgres");
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery("SELECT file_type, COUNT(*) FROM documents GROUP BY file_type")) {
            while(rs.next()) {
                System.out.println("TYPE: " + rs.getString(1) + " COUNT: " + rs.getInt(2));
            }
        }
    }
}
