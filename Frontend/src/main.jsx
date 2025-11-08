import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { createRoutesFromElements, Route } from "react-router-dom";
import "./index.css";
import ErrorPage from "./error-page";
import Root, { loader as rootLoader } from "./routes/root"; // Remove action as rootAction
import Book, { loader as bookLoader, action as bookAction, } from "./routes/book";
import EditBook, { action as editAction, } from "./routes/edit";
import { action as destroyAction } from "./routes/destroy";
import Index from "./routes/index";
import { addBookAction } from "./routes/add";
import Books, { loader as booksLoader } from "./routes/books";
import Protected from "./auth/Protected";
import { AuthProvider } from "./auth/AuthProvider";
import Login from "./routes/login";
import Logout from "./routes/logout";
import Register from "./routes/Register";

const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path="login" element={<Login />} />
      <Route path="register" element={<Register />} />
      <Route path="logout" element={<Logout />} />
      <Route
        path="/"
        element={<Protected><Root /></Protected>}
        loader={rootLoader}
        errorElement={<ErrorPage />}
      >
        <Route errorElement={<ErrorPage />}>
          <Route index element={<Navigate to="/books" replace />} />
          
          <Route
            path="books"
            element={<Protected><Books /></Protected>}
            loader={booksLoader}
          />
          <Route
            path="books/new"
            element={<Protected><EditBook /></Protected>}
            action={addBookAction}
          />
          <Route
            path="books/:bookId"
            element={<Protected><Book /></Protected>}
            loader={bookLoader}
            action={bookAction}
          />
          <Route
            path="books/:bookId/edit"
            element={<Protected><EditBook /></Protected>}
            loader={bookLoader}
            action={editAction}
          />
          <Route
            path="books/:bookId/destroy"
            action={destroyAction}
          />
        </Route>
      </Route>
    </>
  )
);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>
);