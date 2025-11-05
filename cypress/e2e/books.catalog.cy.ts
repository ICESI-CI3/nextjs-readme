describe("Books - Catalog & Details", () => {
  beforeEach(() => {
    cy.uiLogin("reader");

    cy.intercept("GET", "**/books", {
      statusCode: 200,
      body: [
        { id: "b1", title: "Clean Code", authors: ["Robert C. Martin"] },
        {
          id: "b2",
          title: "The Pragmatic Programmer",
          authors: ["Andrew Hunt", "David Thomas"],
        },
      ],
    }).as("getBooks");

    cy.visit("/books");
    cy.wait("@getBooks");
  });

  it("shows the book list and can filter by title", () => {
    cy.contains("Clean Code").should("exist");
    cy.contains("The Pragmatic Programmer").should("exist");

    cy.get('input[placeholder="Search books"]').type("clean");
    cy.contains("Clean Code").should("exist");
    cy.contains("The Pragmatic Programmer").should("not.exist");
  });

  it("opens a book detail page", () => {
    cy.contains("Clean Code").click();

    cy.intercept("GET", "**/books/b1", {
      statusCode: 200,
      body: {
        id: "b1",
        title: "Clean Code",
        authors: ["Robert C. Martin"],
        description: "…",
      },
    }).as("getBook");

    cy.url().should("include", "/books/");
    cy.wait("@getBook");
    cy.contains("Clean Code").should("exist");
  });
});
