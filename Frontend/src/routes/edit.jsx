import { Form, useLoaderData, redirect, useNavigate } from "react-router-dom";
import { updateBook } from "../books";

export async function action({ request, params }) {
  const formData = await request.formData();
  const updates = Object.fromEntries(formData);
  await updateBook(params.bookId, updates);
  return redirect(`/books/${params.bookId}`);
}

export default function EditBook() {
  const { book } = useLoaderData() || { book: { title: "", author: "", status: "to-read", review: "" } };
  const navigate = useNavigate();

  return (
    <Form method="post" id="contact-form">
      <p>
        <span>Title</span>
        <input
          placeholder="Book Title"
          aria-label="Book Title"
          type="text"
          name="title"
          defaultValue={book?.title}
        />
        <input
          placeholder="Author"
          aria-label="Author"
          type="text"
          name="author"
          defaultValue={book?.author}
        />
      </p>
      <label>
        <span>Status</span>
        <select name="status" defaultValue={book?.status}>
          <option value="to-read">To Read</option>
          <option value="reading">Reading</option>
          <option value="read">Read</option>
        </select>
      </label>
      <label>
        <span>Review</span>
        <textarea
          name="review"
          defaultValue={book?.review}
          rows={6}
        />
      </label>
      <p>
        <button type="submit">Save</button>
        <button type="button" onClick={() => { navigate(-1); }}>Cancel</button>
      </p>
    </Form>
  );
}