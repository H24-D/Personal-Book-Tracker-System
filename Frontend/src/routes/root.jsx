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
  const { q } = useLoaderData();
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

  const initial = user?.username ? user.username.charAt(0).toUpperCase() : "?";

  return (
    <>
      {/* ══════════════════════════
          MOBILE HEADER
      ══════════════════════════ */}
      <header id="mob-header">
        <div id="mob-top">
          <span id="mob-logo">📚 Book Tracker</span>
          {user && (
            <span id="mob-user">
              <span id="mob-dot" />
              {user.username}
            </span>
          )}
          <Link to="/books/new" id="mob-new">+ New</Link>
        </div>
        <div id="mob-search">
          <Form role="search" action="/books" id="mob-search-form">
            <span id="mob-search-icon">🔍</span>
            <input
              id="q-mobile"
              type="search"
              name="q"
              placeholder="Search books..."
              defaultValue={q || ""}
              onChange={(e) => submit(e.currentTarget.form, { replace: q != null })}
            />
          </Form>
        </div>
      </header>

      {/* ══════════════════════════
          DESKTOP SIDEBAR
      ══════════════════════════ */}
      <aside id="sidebar">

        {/* User card */}
        {user && (
          <div id="sb-user">
            <div id="sb-avatar">{initial}</div>
            <div id="sb-user-text">
              <div id="sb-name">{user.username}</div>
              <div id="sb-role">Reader</div>
            </div>
            <div id="sb-dot" />
          </div>
        )}

        {/* Search + New */}
        <div id="sb-search-row">
          <Form role="search" action="/books" id="sb-search-form">
            <div id="sb-search-wrap">
              <span id="sb-search-ico">🔍</span>
              <input
                id="q"
                type="search"
                name="q"
                placeholder="Search..."
                defaultValue={q || ""}
                onChange={(e) => submit(e.currentTarget.form, { replace: q != null })}
              />
              {searching && <div id="sb-spinner" />}
            </div>
          </Form>
          <Link to="/books/new" id="sb-new-btn">+ New</Link>
        </div>

        {/* Nav */}
        <nav id="sb-nav">
          <ul>
            <li>
              <NavLink to="/books" end className={({ isActive }) => "sb-link" + (isActive ? " sb-active" : "")}>
                <span>📖</span> My Books
              </NavLink>
            </li>
            <li>
              <NavLink to="/books/new" className={({ isActive }) => "sb-link" + (isActive ? " sb-active" : "")}>
                <span>➕</span> Add Book
              </NavLink>
            </li>
          </ul>
        </nav>

        {/* Footer */}
        <div id="sb-footer">
          <button type="button" className="sb-foot-btn" onClick={() => { window.location.href = "/login"; }}>
            <span>🔑</span> Login
          </button>
          <button type="button" className="sb-foot-btn sb-logout" onClick={() => { logout(); window.location.href = "/login"; }}>
            <span>🚪</span> Log out
          </button>
        </div>

        {/* Brand */}
        <div id="sb-brand">📚 Personal Book Tracker</div>
      </aside>

      {/* ══════════════════════════
          CONTENT
      ══════════════════════════ */}
      <main id="detail" className={navigation.state === "loading" ? "loading" : ""}>
        <Outlet />
      </main>

      {/* ══════════════════════════
          MOBILE BOTTOM NAV
      ══════════════════════════ */}
      <nav id="mob-nav">
        <NavLink to="/books" end className={({ isActive }) => "mob-tab" + (isActive ? " mob-active" : "")}>
          <span className="mob-icon">📖</span>
          <span>Books</span>
        </NavLink>
        <NavLink to="/books/new" className={({ isActive }) => "mob-tab" + (isActive ? " mob-active" : "")}>
          <span className="mob-icon">➕</span>
          <span>Add</span>
        </NavLink>
        <button type="button" className="mob-tab mob-tab-logout" onClick={() => { logout(); window.location.href = "/login"; }}>
          <span className="mob-icon">🚪</span>
          <span>Logout</span>
        </button>
      </nav>
    </>
  );
}
