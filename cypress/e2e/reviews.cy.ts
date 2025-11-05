describe("reviews", () => {
  beforeEach(() => {
    cy.uiLogin("reader");

    // Mock books API
    cy.intercept("GET", "/api/books", { 
      statusCode: 200, 
      body: [{ id: "b1", title: "Clean Code" }] 
    }).as("books");
  });

  it("creates a new review", () => {
    cy.visit("/reviews/new");
    cy.wait("@books");

    cy.get("form").should("exist");

    // Select book and rating
    cy.get('[data-testid="book-select"]').select('b1');
    cy.get('[data-testid="rating-select"]').select('5');

    // Type review
    cy.get('textarea').type('Great!');

    // Mock POST request
    cy.intercept("POST", "**/api/reviews", {
      statusCode: 201,
      body: {
        id: "r1",
        bookId: "b1",
        rating: 5,
        text: "Great!",
        book: { title: "Clean Code" }
      }
    }).as("createReview");

    // Submit
    cy.get("form").submit();
    cy.wait("@createReview").its("response.statusCode").should("eq", 201);
  });

  it("edits and deletes a review", () => {
    // Mock GET review detail
    cy.intercept("GET", "**/api/reviews/r3", {
      statusCode: 200,
      body: {
        id: "r3",
        bookId: "b1",
        rating: 2,
        comment: "meh",
        book: { title: "X" },
        user: { name: "reader1" },
        status: "approved",
      },
    }).as("getReview");

    // Mock PUT request (edit)
    cy.intercept("PUT", "**/api/reviews/r3", (req) => {
      req.reply({
        statusCode: 200,
        body: { id: "r3", bookId: "b1", rating: req.body.rating, comment: req.body.comment },
      });
    }).as("updateReview");

    // Mock DELETE request
    cy.intercept("DELETE", "**/api/reviews/r3", { statusCode: 200, body: { ok: true } }).as("deleteReview");

    // Mock GET reviews after deletion
    cy.intercept("GET", "**/api/reviews", { statusCode: 200, body: [] }).as("listReviewsAfterDelete");

    // Visit review detail page
    cy.visit("/reviews/r3");
    cy.wait("@getReview");

    // Click "Edit review"
    cy.contains("Edit review").click();

    // Fill form and submit
    cy.get("form").within(() => {
      cy.get('[data-testid="rating-select"]').select("3 - Average");
      cy.get('[data-testid="review-textarea"]').clear().type("ok");
      cy.get("button[type='submit']").click();
    });

    // Wait for the PUT mock
    cy.wait("@updateReview");

    // Confirm UI updated (check rendered text, not textarea)
    cy.get('[data-testid="review-row"]').should("contain.text", "ok");

    // Delete the review
    cy.contains("Delete").click();
    cy.wait("@deleteReview");
    cy.wait("@listReviewsAfterDelete");

    // Confirm review is gone
    cy.get('[data-testid="review-row"]').should("not.exist");
  });
});
