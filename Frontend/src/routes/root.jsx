import { useEffect } from "react";
import {
  Outlet, Link, NavLink, useLoaderData,
  Form, useNavigation, useSubmit
} from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { getBooks } from "../books";

export async function loader({ request }) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q");
  const books = await getBooks(q);
  return { books, q };
}

export default function Root() {
  const { books, q } = useLoaderData();
  const navigation = useNavigation();
  const submit = useSubmit();
  const { user, logout } = useAuth();

  const searching =
    navigation.location &&
    new URLSearchParams(navigation.location.search).has("q");

  useEffect(() => {
    const el = document.getElementById("q");
    if (el) el.value = q || "";
    const el2 = document.getElementById("q-mobile");
    if (el2) el2.value = q || "";
  }, [q]);

  const initials = user?.username ? user.username.charAt(0).toUpperCase() : "?";

  return (
    <>
      {/* ════════════════════════════════
          MOBILE HEADER
      ════════════════════════════════ */}
      <div id="mobile-header">
        <div className="mobile-header-top">
          <span className="mobile-title">📚 <span>Book Tracker</span></span>
          {user && <span className="mobile-user">{user.username}</span>}
          <Link to="/books/new" className="mobile-new-btn">+ New</Link>
        </div>
        <div className="mobile-search-row">
          <Form role="search" action="/books" className="mobile-search-form">
            <div className="mobile-search-wrap">
              <span className="mobile-search-icon">🔍</span>
              <input
                id="q-mobile"
                className="mobile-search-input"
                aria-label="Search books"
                placeholder="Search books..."
                type="search"
                name="q"
                defaultValue={q || ""}
                onChange={(e) => {
                  submit(e.currentTarget.form, { replace: q != null });
                }}
              />
            </div>
          </Form>
        </div>
      </div>

      {/* ════════════════════════════════
          DESKTOP SIDEBAR
      ════════════════════════════════ */}
      <div id="sidebar">

        {/* User card */}
        {user && (
          <div className="sb-user">
            <div className="sb-avatar">{initials}</div>
            <div className="sb-user-info">
              <span className="sb-username">{user.username}</span>
              <span className="sb-role">Reader</span>
            </div>
            <span className="sb-online-dot" />
          </div>
        )}

        {/* Search + New — inline flex row */}
        <div className="sb-search-row">
          <Form role="search" action="/books" className="sb-search-form">
            <div className="sb-search-wrap">
              <svg className="sb-search-icon" viewBox="0 0 20 20" fill="none">
                <path d="M13 13l3 3m-7-1a6 6 0 100-12 6 6 0 000 12z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              <input
                id="q"
                type="search"
                name="q"
                className={`sb-search-input${searching ? " loading" : ""}`}
                placeholder="Search..."
                aria-label="Search books"
                defaultValue={q || ""}
                onChange={(e) => {
                  submit(e.currentTarget.form, { replace: q != null });
                }}
              />
              {searching && <div className="sb-spinner" />}
            </div>
          </Form>
          <Link to="/books/new" className="sb-new-btn">+ New</Link>
        </div>

        {/* Nav links */}
        <nav className="sb-nav">
          <ul>
            <li>
              <NavLink to="/books" end className={({ isActive }) => isActive ? "sb-link sb-link--active" : "sb-link"}>
                <span className="sb-link-icon">📖</span>
                My Books
              </NavLink>
            </li>
            <li>
              <NavLink to="/books/new" className={({ isActive }) => isActive ? "sb-link sb-link--active" : "sb-link"}>
                <span className="sb-link-icon">➕</span>
                Add Book
              </NavLink>
            </li>
          </ul>
        </nav>

        {/* Footer */}
        <div className="sb-footer">
          <button type="button" className="sb-footer-link" onClick={() => { window.location.href = "/login"; }}>
            <span className="sb-link-icon">🔑</span>
            Login
          </button>
          <button type="button" className="sb-footer-link sb-footer-link--danger" onClick={() => { logout(); window.location.href = "/login"; }}>
            <span className="sb-link-icon">🚪</span>
            Log out
          </button>
        </div>

        {/* Branding */}
        <div className="sb-brand">📚 Personal Book Tracker</div>
      </div>

      {/* ════════════════════════════════
          MAIN CONTENT
      ════════════════════════════════ */}
      <div id="detail" className={navigation.state === "loading" ? "loading" : ""}>
        <Outlet />
      </div>

      {/* ════════════════════════════════
          MOBILE BOTTOM NAV
      ════════════════════════════════ */}
      <nav id="mobile-nav">
        <NavLink to="/books" end className={({ isActive }) => isActive ? "mob-nav-item active" : "mob-nav-item"}>
          <span className="nav-icon">📖</span>
          Books
        </NavLink>
        <NavLink to="/books/new" className={({ isActive }) => isActive ? "mob-nav-item active" : "mob-nav-item"}>
          <span className="nav-icon">➕</span>
          Add
        </NavLink>
        <button type="button" className="mob-nav-item mob-logout" onClick={() => { logout(); window.location.href = "/login"; }}>
          <span className="nav-icon">🚪</span>
          Logout
        </button>
      </nav>
    </>
  );
}
