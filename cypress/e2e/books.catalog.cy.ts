describe("Books - Catalog & Details (Fully Mocked)", () => {
  const books = [
    { id: "b1", title: "Clean Code", authors: ["Robert C. Martin"] },
    { id: "b2", title: "The Pragmatic Programmer", authors: ["Andrew Hunt", "David Thomas"] },
  ];

  beforeEach(() => {
    cy.uiLogin("reader");

    // Mock user API
    cy.intercept("GET", "/api/users/me", {
      statusCode: 200,
      body: { id: "u1", name: "reader" },
    }).as("getUser");

    cy.intercept(
      "GET",
      "https://www.googleapis.com/books/v1/volumes*",
      (req) => {
        if (req.url.includes("intitle:popular+books")) {
          req.reply({
            statusCode: 200,
            body: {
              items: books.map((b) => ({
                id: b.id,
                volumeInfo: {
                  title: b.title,
                  authors: b.authors,
                  description: `${b.title} description`,
                  imageLinks: { thumbnail: "https://example.com/cover.jpg" },
                },
              })),
            },
          });
        } else {
          req.reply({ statusCode: 200, body: { items: [] } });
        }
      }
    ).as("getGoogle");
  });

  it("shows the book list and can filter by title", () => {
    cy.visit("/books");
    cy.wait("@getUser");
    cy.wait("@getGoogle");

    cy.get('input[placeholder="Search by title"]').as("searchBox");

    cy.contains("Clean Code").should("exist");
    cy.contains("The Pragmatic Programmer").should("exist");

    cy.get("@searchBox").type("clean");
    cy.wait("@getGoogle"); // wait for filtered search
    cy.contains("Clean Code").should("exist");
  });

it("opens a book detail page by clicking a book", () => {
  cy.intercept("GET", "https://www.googleapis.com/books/v1/volumes/b1", {
    statusCode: 200,
    body: {
      id: "b1",
      volumeInfo: {
        title: "Clean Code",
        authors: ["Robert C. Martin"],
        description: "Clean Code description",
        imageLinks: { thumbnail: "https://example.com/cover.jpg" },
      },
    },
  }).as("getGoogleDetail");

    // Visit the catalog page
    cy.visit("/books");
    cy.wait("@getUser");
    cy.wait("@getGoogle"); // wait for the catalog/search mock

    // Click on the book to go to detail
    cy.contains("Clean Code").click();

    // Wait for the detail request to be mocked
    cy.wait("@getGoogleDetail");

    // Assert the detail page renders
    cy.url().should("include", "/books/google/b1");
  });


});
