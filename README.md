# 🔍 DocSearch - High Performance Document Search Engine

A secure and high-performance document search engine built using Spring Boot, Apache Lucene, PostgreSQL, and JWT Authentication. It enables users to upload, search, preview, bookmark, download, and manage documents with lightning-fast full-text search.

---

## 🌐 Live Demo

**Application:**  
https://docsearch-o6fc.onrender.com

**API Health Check:**  
https://docsearch-o6fc.onrender.com/actuator/health

---

## 🚀 Features

### 🔐 Authentication & Security
- JWT Authentication
- Spring Security
- Role-Based Access Control (Admin/User)
- Secure Login & Registration
- BCrypt Password Encryption

### 📄 Document Management
- Upload PDF, DOCX, and TXT files
- Preview Documents
- Download Documents
- Delete Documents
- Automatic Lucene Indexing

### 🔍 Full-Text Search
- Apache Lucene Search Engine
- Fast Keyword Search
- Relevance-Based Ranking (BM25)
- Search History
- Recent Searches

### ⭐ Bookmarks
- Add Bookmark
- Remove Bookmark
- View Saved Documents

### 👤 User Dashboard
- My Documents
- Search Statistics
- Bookmark Statistics
- Recent Searches

### 👨‍💼 Admin Features
- View All Users
- Delete Users
- Last Admin Protection
- Manage Documents

---

## 🛠️ Technology Stack

### Backend
- Java 24
- Spring Boot
- Spring Security
- JWT Authentication
- Spring Data JPA
- Hibernate
- Apache Lucene
- Maven

### Database
- PostgreSQL

### Frontend
- HTML5
- CSS3
- JavaScript
- Bootstrap 5

### Tools
- Git
- GitHub
- VS Code
- Postman
- pgAdmin

---

## 📂 Database Tables

- users
- documents
- bookmarks
- search_history

---

## ⚡ Core Functionalities

- User Authentication
- Upload Documents
- Full-Text Search
- Document Preview
- Download Documents
- Bookmark Management
- Search History
- User Management
- Dashboard Statistics
- Lucene Index Management

---

## 🔒 Security

- JWT Authentication
- BCrypt Password Encryption
- Role-Based Authorization
- Protected REST APIs

---

## ▶️ Run the Project

### Clone Repository

```bash
git clone https://github.com/Kalyani132004/DocSearch.git
```

### Backend

```bash
cd backend
mvn clean install
mvn spring-boot:run
```

Open your browser:

```
http://localhost:8080
```

---

## 🚀 Future Enhancements

- OCR Support
- AI-Based Search Suggestions
- Search Autocomplete
- Advanced Filters
- Analytics Dashboard

---

## 👩‍💻 Developed By

**Kalyani Sonawane**

---

⭐ If you found this project useful, consider giving it a Star on GitHub.
