describe("Books - Admin CRUD", () => {
  beforeEach(() => {
    cy.uiLogin("admin");

    // Mock /api/users/me so the page knows you are admin
    cy.intercept("GET", "/api/users/me", {
      statusCode: 200,
      body: { id: "u1", name: "admin", role: "admin" },
    }).as("getUser");

    // Mock POST /api/books for createBook
    cy.intercept("POST", "/api/books", {
      statusCode: 201,
      body: {
        id: "b200",
        title: "Domain-Driven Design",
        authors: ["Eric Evans"],
        isbn: "978-0321125217",
      },
    }).as("createBook");
  });

  it("creates a new book", () => {
    // Visit the actual create page
    cy.visit("/books/create");
    cy.wait("@getUser");

    // Now the inputs exist
    cy.get('[data-testid="book-title-input"]').type("Domain-Driven Design");
    cy.get('[data-testid="book-authors-input"]').type("Eric Evans");
    cy.get('[data-testid="book-isbn-input"]').type("978-0321125217");

    cy.wait("@createBook");

    // Success toast shows up
    cy.contains("Book created successfully.").should("exist");
  });

  it("updates an existing book", () => {
    // Mock the book list before performing any actions
    cy.intercept("GET", "**/books", {
      statusCode: 200,
      body: [{ id: "b1", title: "Old Title", authors: ["Anon"] }],
    }).as("list");

    // Visit the admin books page
    cy.visit("/admin/books");
    cy.wait("@list");

    // Mock the PATCH request for updating
    cy.intercept("PATCH", "**/books/b1", {
      statusCode: 200,
      body: { id: "b1", title: "New Title", authors: ["Anon"] },
    }).as("update");

    // Click the edit button in the correct row
    cy.contains('[data-testid="book-row"]', "Old Title")
      .within(() => {
        cy.contains("Edit").click();
      });

    cy.get('input[name="title"]').clear().type("New Title");
    cy.get('button[type="submit"]').click();

    cy.wait("@update");
    cy.contains('[data-testid="book-row"]', "New Title").should("exist");
  });

  it("deletes a book", () => {
    // Mock the book list
    cy.intercept("GET", "**/books", {
      statusCode: 200,
      body: [{ id: "b3", title: "To Delete", authors: ["X"] }],
    }).as("list2");

    // Visit admin books page
    cy.visit("/admin/books");
    cy.wait("@list2");

    // Mock the DELETE request
    cy.intercept("DELETE", "**/books/b3", {
      statusCode: 200,
      body: { ok: true },
    }).as("del");

    // Click the delete button in the correct row
    cy.contains('[data-testid="book-row"]', "To Delete")
      .within(() => {
        cy.contains("Delete").click();
      });

    cy.wait("@del");

    // Assert the book is gone
    cy.contains('[data-testid="book-row"]', "To Delete").should("not.exist");
  });
});
