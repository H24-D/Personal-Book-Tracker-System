import api from "./api";

export async function getBooks(query) {
  try {
    const books = await api.get("/books");
    
    if (query) {
      const lowerQuery = query.toLowerCase();
      return books.filter(book => 
        book.title?.toLowerCase().includes(lowerQuery) ||
        book.author?.toLowerCase().includes(lowerQuery)
      );
    }
    
    return books.sort((a, b) => {
      const titleA = (a.title || "").toLowerCase();
      const titleB = (b.title || "").toLowerCase();
      return titleA.localeCompare(titleB);
    });
  } catch (error) {
    console.error("Failed to fetch books:", error);
    return [];
  }
}

export async function createBook(updates = {}) {
  try {
    const book = await api.post("/books", {
      title: updates.title || "",
      author: updates.author || "",
      status: updates.status || "to-read",
      review: updates.review || "",
      favorite: updates.favorite || false
    });
    return book;
  } catch (error) {
    console.error("Failed to create book:", error);
    throw error;
  }
}

export async function getBook(id) {
  try {
    const book = await api.get(`/books/${id}`);
    return book;
  } catch (error) {
    console.error("Failed to fetch book:", error);
    return null;
  }
}

export async function updateBook(id, updates) {
  try {
    const book = await api.put(`/books/${id}`, updates);
    return book;
  } catch (error) {
    console.error("Failed to update book:", error);
    throw error;
  }
}

export async function deleteBook(id) {
  try {
    await api.delete(`/books/${id}`);
    return true;
  } catch (error) {
    console.error("Failed to delete book:", error);
    return false;
  }
}