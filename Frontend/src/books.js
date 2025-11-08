import localforage from "localforage";
import { matchSorter } from "match-sorter";
import sortBy from "sort-by";

export async function getBooks(query) {
  await fakeNetwork(`getBooks:${query}`);
  let books = await localforage.getItem("books");
  if (!books) books = [];
  if (query) {
    books = matchSorter(books, query, { keys: ["title", "author"] });
  }
  return books.sort(sortBy("title", "createdAt"));
}

export async function createBook(updates = {}) {
  await fakeNetwork();
  let id = Math.random().toString(36).substring(2, 9);
  let book = { 
    id, 
    createdAt: Date.now(),
    title: "",
    author: "",
    cover: "",
    status: "to-read",
    review: "",
    ...updates  // Add the form data here
  };
  let books = await getBooks();
  books.unshift(book);
  await set(books);
  return book;
}

export async function getBook(id) {
  await fakeNetwork(`book:${id}`);
  let books = await localforage.getItem("books");
  let book = books.find(book => book.id === id);
  return book ?? null;
}

export async function updateBook(id, updates) {
  await fakeNetwork();
  let books = await localforage.getItem("books");
  let book = books.find(book => book.id === id);
  if (!book) throw new Error("No book found for", id);
  Object.assign(book, updates);
  await set(books);
  return book;
}

export async function deleteBook(id) {
  let books = await localforage.getItem("books");
  let index = books.findIndex(book => book.id === id);
  if (index > -1) {
    books.splice(index, 1);
    await set(books);
    return true;
  }
  return false;
}

function set(books) {
  return localforage.setItem("books", books);
}

// fake a cache so we don't slow down stuff we've already seen
let fakeCache = {};

async function fakeNetwork(key) {
  if (!key) {
    fakeCache = {};
  }

  if (fakeCache[key]) {
    return;
  }

  fakeCache[key] = true;
  return new Promise(res => {
    setTimeout(res, Math.random() * 800);
  });
}