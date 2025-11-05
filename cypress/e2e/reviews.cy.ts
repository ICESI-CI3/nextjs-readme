describe("Reviews", () => {
  beforeEach(() => {
    cy.uiLogin("reader");
    cy.visit("/reviews");
  });

  it("lists reviews and creates a new one", () => {
    cy.intercept("GET", "**/reviews", {
      statusCode: 200,
      body: [
        {
          id: "r1",
          bookId: "b1",
          rating: 4,
          comment: "Nice",
          book: { title: "Clean Code" },
        },
      ],
    }).as("list");

    cy.reload();
    cy.wait("@list");
    cy.contains("Clean Code").should("exist");
    cy.contains("★ 4").should("exist");

    cy.intercept("POST", "**/reviews", {
      statusCode: 201,
      body: { id: "r2", bookId: "b1", rating: 5, comment: "Great!" },
    }).as("create");

    cy.contains("Add Review").click();
    cy.get('select[name="bookId"]').select("b1");
    cy.get('input[name="rating"]').clear().type("5");
    cy.get('textarea[name="comment"]').type("Great!");
    cy.get('button[type="submit"]').click();
    cy.wait("@create");

    cy.contains("Great!").should("exist");
  });

  it("edits and deletes a review", () => {
    cy.intercept("GET", "**/reviews", {
      statusCode: 200,
      body: [
        {
          id: "r3",
          bookId: "b1",
          rating: 2,
          comment: "meh",
          book: { title: "X" },
        },
      ],
    }).as("list2");

    cy.reload();
    cy.wait("@list2");

    cy.intercept("PATCH", "**/reviews/r3", {
      statusCode: 200,
      body: { id: "r3", bookId: "b1", rating: 3, comment: "ok" },
    }).as("update");

    cy.contains("meh")
      .parents('[data-testid="review-row"]')
      .within(() => {
        cy.contains("Edit").click();
      });

    cy.get('input[name="rating"]').clear().type("3");
    cy.get('textarea[name="comment"]').clear().type("ok");
    cy.get('button[type="submit"]').click();
    cy.wait("@update");

    cy.contains("ok").should("exist");

    cy.intercept("DELETE", "**/reviews/r3", {
      statusCode: 200,
      body: { ok: true },
    }).as("del");
    cy.contains("ok")
      .parents('[data-testid="review-row"]')
      .within(() => {
        cy.contains("Delete").click();
      });
    cy.wait("@del");
    cy.contains("ok").should("not.exist");
  });
});
