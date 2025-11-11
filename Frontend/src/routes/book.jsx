import { Form, useLoaderData, useFetcher } from "react-router-dom";
import { getBook, updateBook } from "../books";

export async function loader({ params }) {
  const book = await getBook(params.bookId);
  return { book };
}

export async function action({ request, params }) {
  const formData = await request.formData();
  const updates = {};
  
  if (formData.has("favorite")) {
    updates.favorite = formData.get("favorite") === "true";
  }
  
  if (formData.has("status")) {
    updates.status = formData.get("status");
  }
  
  return updateBook(params.bookId, updates);
}

export default function Book() {
  const { book } = useLoaderData();

  return (
    <div id="book">
      <div>
        <img
          src={`https://robohash.org/${book.id}.png?size=200x200`}
          alt={book.title}
        />
      </div>

      <div>
        <h1>
          {book.title ? (
            <>
              {book.title}
            </>
          ) : (
            <i>No Title</i>
          )}{" "}
          <Favorite book={book} />
        </h1>
        
        <p>
          <strong>Author:</strong> {book.author || <i> No Author</i>}
        </p>
        
        {book.status && (
          <p style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <strong>Status:</strong>
            <span className={`book-status-badge ${book.status}`}>
              {book.status === 'to-read' ? 'To Read' : 
               book.status === 'reading' ? 'Reading' : 'Read'}
            </span>
          </p>
        )}

        {book.review && (
          <p>
            <strong>Review:</strong> {book.review}
          </p>
        )}

        <div>
          <Form action="edit">
            <button type="submit">Edit</button>
          </Form>
          <Form
            method="post"
            action="destroy"
            onSubmit={(event) => {
              if (
                !confirm(
                  "Please confirm you want to delete this record."
                )
              ) {
                event.preventDefault();
              }
            }}
          >
            <button type="submit">Delete</button>
          </Form>
        </div>
      </div>
    </div>
  );
}

function Favorite({ book }) {
  const fetcher = useFetcher();
  const favorite = fetcher.formData
    ? fetcher.formData.get("favorite") === "true" 
    : book.favorite;
    
  return (
    <fetcher.Form method="post">
      <button
        name="favorite"
        value={favorite ? "false" : "true"}
        aria-label={
          favorite
            ? "Remove from favorites"
            : "Add to favorites"
        }
      >
        {favorite ? "★" : "☆"}
      </button>
    </fetcher.Form>
  );
}