package com.docsearch.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "search_history")
public class SearchHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 500)
    private String query;

    @Column(name = "result_count")
    private Integer resultCount;

    @Column(name = "searched_at")
    private LocalDateTime searchedAt;

    public SearchHistory() {}

    public SearchHistory(Long id, User user, String query, Integer resultCount, LocalDateTime searchedAt) {
        this.id = id;
        this.user = user;
        this.query = query;
        this.resultCount = resultCount;
        this.searchedAt = searchedAt;
    }

    @PrePersist
    public void prePersist() {
        if (searchedAt == null) {
            searchedAt = LocalDateTime.now();
        }
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public String getQuery() { return query; }
    public void setQuery(String query) { this.query = query; }

    public Integer getResultCount() { return resultCount; }
    public void setResultCount(Integer resultCount) { this.resultCount = resultCount; }

    public LocalDateTime getSearchedAt() { return searchedAt; }
    public void setSearchedAt(LocalDateTime searchedAt) { this.searchedAt = searchedAt; }
}
