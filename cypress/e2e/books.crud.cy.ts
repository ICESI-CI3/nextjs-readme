describe("Books - Admin CRUD", () => {
  beforeEach(() => {
    cy.uiLogin("admin");
    cy.visit("/admin/books");
  });

  it("creates a new book", () => {
    cy.intercept("POST", "**/books", {
      statusCode: 201,
      body: {
        id: "b200",
        title: "Domain-Driven Design",
        authors: ["Eric Evans"],
      },
    }).as("createBook");

    cy.contains("New Book").click();
    cy.get('input[name="title"]').type("Domain-Driven Design");
    cy.get('input[name="authors"]').type("Eric Evans");
    cy.get('button[type="submit"]').click();

    cy.wait("@createBook");
    cy.contains("Domain-Driven Design").should("exist");
  });

  it("updates an existing book", () => {
    cy.intercept("GET", "**/books", {
      statusCode: 200,
      body: [{ id: "b1", title: "Old Title", authors: ["Anon"] }],
    }).as("list");

    cy.reload();
    cy.wait("@list");

    cy.intercept("PATCH", "**/books/b1", {
      statusCode: 200,
      body: { id: "b1", title: "New Title", authors: ["Anon"] },
    }).as("update");

    cy.contains("Old Title")
      .parents('[data-testid="book-row"]')
      .within(() => {
        cy.contains("Edit").click();
      });

    cy.get('input[name="title"]').clear().type("New Title");
    cy.get('button[type="submit"]').click();

    cy.wait("@update");
    cy.contains("New Title").should("exist");
  });

  it("deletes a book", () => {
    cy.intercept("GET", "**/books", {
      statusCode: 200,
      body: [{ id: "b3", title: "To Delete", authors: ["X"] }],
    }).as("list2");

    cy.reload();
    cy.wait("@list2");

    cy.intercept("DELETE", "**/books/b3", {
      statusCode: 200,
      body: { ok: true },
    }).as("del");

    cy.contains("To Delete")
      .parents('[data-testid="book-row"]')
      .within(() => {
        cy.contains("Delete").click();
      });

    cy.wait("@del");
    cy.contains("To Delete").should("not.exist");
  });
});
