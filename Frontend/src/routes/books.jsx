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
    const c = { all: books.length, "to-read": 0, reading: 0, read: 0 };
    books.forEach((b) => { if (b.status) c[b.status] = (c[b.status] || 0) + 1; });
    return c;
  }, [books]);

  const filteredBooks = useMemo(() =>
    activeFilter === "all" ? books : books.filter((b) => b.status === activeFilter),
    [books, activeFilter]
  );

  const filters = [
    { id: "all",     label: "All Books", icon: null },
    { id: "to-read", label: "To Read",   icon: "to-read" },
    { id: "reading", label: "Reading",   icon: "reading" },
    { id: "read",    label: "Read",      icon: "read" },
  ];

  const handleFilter = (id) => {
    const p = new URLSearchParams(searchParams);
    id === "all" ? p.delete("status") : p.set("status", id);
    setSearchParams(p);
  };

  const emojis = ["📘","📕","📗","📙","📓","📔","📒"];

  return (
    <div className="books-container">
      <h2 className="books-title">
        {q ? `Results for "${q}"` : "All Books"}
      </h2>

      <div className="filter-tabs">
        {filters.map((f) => (
          <button
            key={f.id}
            className={`filter-tab${activeFilter === f.id ? " active" : ""}`}
            onClick={() => handleFilter(f.id)}
          >
            {f.icon && <span className={`status-icon ${f.icon}`} />}
            {f.label}
            <span className="filter-tab-count">{statusCounts[f.id] || 0}</span>
          </button>
        ))}
      </div>

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
                    <div className="book-icon">{emojis[idx % emojis.length]}</div>
                    <div className="book-content">
                      <span className="book-title">{book.title || "No Title"}</span>
                      {book.author && <span className="book-author">{book.author}</span>}
                    </div>
                    <div className="book-meta">
                      {/* MySQL returns 0/1 — check explicitly */}
                      {(book.favorite === 1 || book.favorite === true) && (
                        <span className="book-fav">★</span>
                      )}
                      {book.status && (
                        <span className={`book-status-badge-small ${book.status}`}>
                          {book.status === "to-read" ? "To Read"
                            : book.status === "reading" ? "Reading" : "Read"}
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
            <span className="no-books-icon">📭</span>
            <p className="no-books-text">
              {q ? `No results for "${q}"`
                : activeFilter !== "all"
                ? `No "${filters.find((f) => f.id === activeFilter)?.label}" books`
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
