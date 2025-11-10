import { useEffect } from "react";
import { Outlet, Link, NavLink, useLoaderData, Form, useNavigation, useSubmit } from "react-router-dom";
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
    document.getElementById("q").value = q;
  }, [q]);

  return (
    <>
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
            <div
              id="search-spinner"
              aria-hidden
              hidden={!searching}
            />
            <div
              className="sr-only"
              aria-live="polite"
            ></div>
          </Form>

          <Link to="/books/new" className="new-button">
            New
          </Link>
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
                onClick={() => {
                  window.location.href = "/login";
                }}
                className="loginbutton"
              >
                🔑 Login
              </button>
            </li>
            <li>
              <button
                onClick={() => {
                  logout();
                  window.location.href = "/login";
                }}
                className="logout-button"
              >
                🚪 Log out
              </button>
            </li>
          </ul>
        </nav>
      </div>

      <div id="detail" className={navigation.state === "loading" ? "loading" : ""}>
        <Outlet />
      </div>
    </>
  );
}