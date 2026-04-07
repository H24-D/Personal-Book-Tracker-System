import { NavLink, useLoaderData, useSearchParams } from "react-router-dom";
import { getBooks } from "../books";
import { useMemo } from "react";
import "../books.css";

export async function loader({ request }) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") || "";
  const books = await getBooks(q);
  return { books, q };
}

export default function Books() {
  const { books, q } = useLoaderData();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeFilter = searchParams.get("status") || "all";

  const statusCounts = useMemo(() => {
    const counts = { all: books.length, "to-read": 0, reading: 0, read: 0 };
    books.forEach((book) => {
      if (book.status) counts[book.status] = (counts[book.status] || 0) + 1;
    });
    return counts;
  }, [books]);

  const filteredBooks = useMemo(() => {
    if (activeFilter === "all") return books;
    return books.filter((book) => book.status === activeFilter);
  }, [books, activeFilter]);

  const filters = [
    { id: "all",     label: "All Books", icon: null },
    { id: "to-read", label: "To Read",   icon: "to-read" },
    { id: "reading", label: "Reading",   icon: "reading" },
    { id: "read",    label: "Read",      icon: "read" },
  ];

  const handleFilterChange = (filterId) => {
    const newParams = new URLSearchParams(searchParams);
    if (filterId === "all") newParams.delete("status");
    else newParams.set("status", filterId);
    setSearchParams(newParams);
  };

  // Pick a book emoji based on index
  const bookEmojis = ["📘", "📕", "📗", "📙", "📓", "📔", "📒"];

  return (
    <div className="books-container">
      {/* ── Title ── */}
      <h2 className="books-title">
        {q ? `Results for "${q}"` : "All Books"}
      </h2>

      {/* ── Filter tabs ── */}
      <div className="filter-tabs">
        {filters.map((filter) => (
          <button
            key={filter.id}
            className={`filter-tab ${activeFilter === filter.id ? "active" : ""}`}
            onClick={() => handleFilterChange(filter.id)}
          >
            {filter.icon && (
              <span className={`status-icon ${filter.icon}`}></span>
            )}
            {filter.label}
            <span className="filter-tab-count">
              {statusCounts[filter.id] || 0}
            </span>
          </button>
        ))}
      </div>

      {/* ── Book list ── */}
      <nav className="books-nav">
        {filteredBooks.length ? (
          <ul className="books-list">
            {filteredBooks.map((book, idx) => (
              <li key={book.id} className="books-item">
                <NavLink
                  to={`/books/${book.id}`}
                  className={({ isActive, isPending }) =>
                    isActive ? "active" : isPending ? "pending" : ""
                  }
                >
                  <div className="book-info-link">
                    {/* Book icon */}
                    <div className="book-icon">
                      {bookEmojis[idx % bookEmojis.length]}
                    </div>

                    {/* Title + author */}
                    <div className="book-content">
                      <span className="book-title">
                        {book.title || "No Title"}
                      </span>
                      {book.author && (
                        <span className="book-author">{book.author}</span>
                      )}
                    </div>

                    {/* Meta: fav + badge */}
                    <div className="book-meta">
                      {book.favorite && (
                        <span className="book-fav">★</span>
                      )}
                      {book.status && (
                        <span className={`book-status-badge-small ${book.status}`}>
                          {book.status === "to-read"
                            ? "To Read"
                            : book.status === "reading"
                            ? "Reading"
                            : "Read"}
                        </span>
                      )}
                    </div>
                  </div>
                </NavLink>
              </li>
            ))}
          </ul>
        ) : (
          <div className="no-books">
            <div className="no-books-icon">📭</div>
            <p className="no-books-text">
              {q
                ? `No results for "${q}"`
                : activeFilter !== "all"
                ? `No books marked as "${filters.find((f) => f.id === activeFilter)?.label}"`
                : "No books yet"}
            </p>
            <p className="no-books-sub">
              {!q && activeFilter === "all" && "Add your first book to get started!"}
            </p>
          </div>
        )}
      </nav>
    </div>
  );
}
