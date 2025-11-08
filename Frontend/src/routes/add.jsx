import { redirect } from "react-router-dom";
import { createBook } from "../books";

export async function addBookAction({ request }) {
  const formData = await request.formData();
  const title = formData.get("title")?.trim();
  const author = formData.get("author")?.trim();
  const cover = formData.get("cover");
  const status = formData.get("status") || "to-read";
  const review = formData.get("review");

  // Validate before creating
  if (!title || !author) {
    throw new Error("Please enter title and author");
  }

  const book = await createBook({ title, author, cover, status, review });
  return redirect(`/books/${book.id}/edit`);
}