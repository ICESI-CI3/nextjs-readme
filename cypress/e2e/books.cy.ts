describe("Books Page", () => {

  const api = {
    books: "/api/books",
    clubs: "/api/clubs",
    reviews: "/api/reviews",
    readingStates: "/api/reading-states",
    mostRead: "/api/reports/most-read",
    mostCommented: "/api/reports/most-commented",
    topReader: "/api/reports/top-reader",
    auth: "/api/auth/me",
  };


  const loginAs = (role: "admin" | "reader") => {
    cy.setCookie("token", "fake-jwt");
    cy.setCookie("role", role);
    localStorage.setItem("token", "fake-jwt");
  };

  describe("Admin (local books)", () => {
    beforeEach(() => {
      loginAs("admin");

      cy.intercept("GET", api.books, {
        statusCode: 200,
        body: [
          {
            id: 1,
            title: "The Hobbit",
            authors: "J.R.R. Tolkien",
            isbn: "123456789",
            cover: null,
            status: "available",
            source: "local",
          },
          {
            id: 2,
            title: "Dune",
            authors: "Frank Herbert",
            isbn: "987654321",
            cover: null,
            status: "checked-out",
            source: "local",
          },
        ],
      }).as("fetchBooks");

      cy.visit("/books");
    });

    it("loads admin books", () => {
      cy.wait("@fetchBooks");
      cy.contains("The Hobbit").should("exist");
      cy.contains("Dune").should("exist");
      cy.contains("ISBN: 123456789").should("exist");
    });

    it("searches backend books", () => {
      cy.intercept("GET", `${api.books}*`, {
        statusCode: 200,
        body: [
          {
            id: 1,
            title: "The Hobbit",
            authors: "J.R.R. Tolkien",
            isbn: "123456789",
            cover: null,
            status: "available",
            source: "local",
          },
        ],
      }).as("searchBooks");

      cy.get("input[placeholder='Search by title']").type("hobbit");
      cy.get("button[type='submit']").click();

      cy.wait("@searchBooks");
      cy.contains("The Hobbit").should("exist");
      cy.contains("Dune").should("not.exist");
    });

    it("shows empty state when no results", () => {
      cy.intercept("GET", `${api.books}/*`, {
        statusCode: 200,
        body: [],
      }).as("searchEmpty");

      cy.get("input[placeholder='Search by title']").type("nothing");
      cy.get("button[type='submit']").click();

      cy.wait("@searchEmpty");
      cy.contains("No books found with that title.").should("exist");
    });
  });

  describe("Reader (Google Books)", () => {
    beforeEach(() => {
      loginAs("reader");

      cy.intercept(
        "GET",
        "https://www.googleapis.com/books/v1/volumes*",
        {
          statusCode: 200,
          body: {
            items: [
              {
                id: "a1",
                volumeInfo: {
                  title: "Harry Potter",
                  authors: ["J.K. Rowling"],
                  industryIdentifiers: [
                    { type: "ISBN_13", identifier: "1234567890" },
                  ],
                  imageLinks: {},
                },
              },
              {
                id: "b2",
                volumeInfo: {
                  title: "Star Wars",
                  authors: ["George Lucas"],
                  industryIdentifiers: [
                    { type: "ISBN_13", identifier: "999888777" },
                  ],
                  imageLinks: {},
                },
              },
            ],
          },
        }
      ).as("googleBooks");

      cy.visit("/books");
    });

    it("loads Google Books items", () => {
      cy.wait("@googleBooks");
      cy.contains("Harry Potter").should("exist");
      cy.contains("Star Wars").should("exist");
    });

    it("searches Google Books", () => {
      cy.intercept(
        "GET",
        "https://www.googleapis.com/books/v1/volumes*search*",
        {
          statusCode: 200,
          body: {
            items: [
              {
                id: "hp-search",
                volumeInfo: {
                  title: "Harry Potter and the Goblet of Fire",
                  authors: ["J.K. Rowling"],
                  industryIdentifiers: [
                    { type: "ISBN_13", identifier: "888222555" },
                  ],
                },
              },
            ],
          },
        }
      ).as("googleSearch");

      cy.get("input[placeholder='Search by title']").type("harry");
      cy.get("button[type='submit']").click();

      cy.wait("@googleSearch");
      cy.contains("Harry Potter and the Goblet of Fire").should("exist");
      cy.contains("Star Wars").should("not.exist");
    });

    it("shows Google 'no results' state", () => {
      cy.intercept(
        "GET",
        "https://www.googleapis.com/books/v1/volumes*search*",
        {
          statusCode: 200,
          body: { items: [] },
        }
      ).as("googleEmpty");

      cy.get("input[placeholder='Search by title']").type("xyz");
      cy.get("button[type='submit']").click();

      cy.wait("@googleEmpty");
      cy.contains("No books found for that search.").should("exist");
    });
  });

  describe("Pagination", () => {
    beforeEach(() => {
      loginAs("reader");

      const items = Array.from({ length: 20 }).map((_, i) => ({
        id: `id-${i}`,
        volumeInfo: {
          title: `Book ${i}`,
          authors: ["Author X"],
        },
      }));

      cy.intercept(
        "GET",
        "https://www.googleapis.com/books/v1/volumes*",
        {
          statusCode: 200,
          body: { items },
        }
      ).as("books");

      cy.visit("/books");
    });

    it("moves between pages", () => {
      cy.wait("@books");

      cy.contains("Book 0").should("exist");
      cy.contains("Book 9").should("not.exist");

      cy.contains("Next").click();

      cy.contains("Book 9").should("exist");
      cy.contains("Book 0").should("not.exist");
    });
  });
});
