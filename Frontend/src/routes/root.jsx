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
    const elMobile = document.getElementById("q-mobile");
    if (elMobile) elMobile.value = q || "";
  }, [q]);

  return (
    <>
      {/* ══════════════════════════════
          MOBILE TOP HEADER
      ══════════════════════════════ */}
      <div id="mobile-header">
        {/* Row 1: title + username + new button */}
        <div className="mobile-header-top">
          <div className="mobile-title">
            📚 <span>Book Tracker</span>
          </div>
          {user && (
            <div className="mobile-user">
              {user.username}
            </div>
          )}
          <Link to="/books/new" className="mobile-new-btn">
            + New
          </Link>
        </div>

        {/* Row 2: search bar */}
        <div className="mobile-search-row">
          <Form
            id="mobile-search-form"
            role="search"
            action="/books"
            className="mobile-search-form"
          >
            <div className="mobile-search-wrap">
              <span className="mobile-search-icon">🔍</span>
              <input
                id="q-mobile"
                className={`mobile-search-input${searching ? " loading" : ""}`}
                aria-label="Search books"
                placeholder="Search books..."
                type="search"
                name="q"
                defaultValue={q || ""}
                onChange={(event) => {
                  const isFirstSearch = q == null;
                  submit(event.currentTarget.form, {
                    replace: !isFirstSearch,
                  });
                }}
              />
            </div>
          </Form>
        </div>
      </div>

      {/* ══════════════════════════════
          DESKTOP SIDEBAR
      ══════════════════════════════ */}
      <div id="sidebar">
        <h1>📚 Personal Book Tracker</h1>

        {user && (
          <div className="user-info">
            <p className="username">👤 {user.username}</p>
          </div>
        )}

        <div>
          <Form id="search-form" role="search" action="/books">
            <input
              id="q"
              className={searching ? "loading" : ""}
              aria-label="Search books"
              placeholder="Search"
              type="search"
              name="q"
              defaultValue={q}
              onChange={(event) => {
                const isFirstSearch = q == null;
                submit(event.currentTarget.form, {
                  replace: !isFirstSearch,
                });
              }}
            />
            <div id="search-spinner" aria-hidden hidden={!searching} />
            <div className="sr-only" aria-live="polite"></div>
          </Form>
          <Link to="/books/new" className="new-button">New</Link>
        </div>

        <nav>
          <ul>
            <li>
              <NavLink
                to="/books"
                className={({ isActive }) => isActive ? "nav-active" : ""}
                end
              >
                📖 My Books
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/books/new"
                className={({ isActive }) => isActive ? "nav-active" : ""}
              >
                ➕ Add Books
              </NavLink>
            </li>
            <li>
              <button
                onClick={() => { window.location.href = "/login"; }}
                className="loginbutton"
              >
                🔑 Login
              </button>
            </li>
            <li>
              <button
                onClick={() => { logout(); window.location.href = "/login"; }}
                className="logout-button"
              >
                🚪 Log out
              </button>
            </li>
          </ul>
        </nav>
      </div>

      {/* ══════════════════════════════
          MAIN CONTENT
      ══════════════════════════════ */}
      <div
        id="detail"
        className={navigation.state === "loading" ? "loading" : ""}
      >
        <Outlet />
      </div>

      {/* ══════════════════════════════
          MOBILE BOTTOM NAV
      ══════════════════════════════ */}
      <nav id="mobile-nav">
        <NavLink
          to="/books"
          className={({ isActive }) => isActive ? "active" : ""}
          end
        >
          <span className="nav-icon">📖</span>
          Books
        </NavLink>

        <NavLink
          to="/books/new"
          className={({ isActive }) => isActive ? "active" : ""}
        >
          <span className="nav-icon">➕</span>
          Add
        </NavLink>

        <button
          className="logout-mob"
          onClick={() => { logout(); window.location.href = "/login"; }}
        >
          <span className="nav-icon">🚪</span>
          Logout
        </button>
      </nav>
    </>
  );
}
