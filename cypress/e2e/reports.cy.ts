describe("Reports (textual metrics)", () => {
  beforeEach(() => {
    cy.uiLogin("reader");
    cy.visit("/reports");
  });

  it("renders aggregated metrics", () => {
    cy.intercept("GET", "**/reports/users-stats", {
      statusCode: 200,
      body: { read: 5, pending: 7, reviews: 3 },
    }).as("usersStats");

    cy.intercept("GET", "**/reports/most-read-book", {
      statusCode: 200,
      body: { id: "b1", title: "Clean Code", reads: 42 },
    }).as("mostRead");

    cy.intercept("GET", "**/reports/most-commented-book", {
      statusCode: 200,
      body: { id: "b2", title: "Refactoring", comments: 13 },
    }).as("mostCommented");

    cy.intercept("GET", "**/reports/top-reader", {
      statusCode: 200,
      body: { userId: "u1", name: "Alice", readCount: 10 },
    }).as("topReader");

    cy.reload();
    cy.wait(["@usersStats", "@mostRead", "@mostCommented", "@topReader"]);
    cy.contains("Read: 5").should("exist"); // ajusta al render real
    cy.contains("Pending: 7").should("exist");
    cy.contains("Reviews: 3").should("exist");
    cy.contains("Clean Code").should("exist");
    cy.contains("Refactoring").should("exist");
    cy.contains("Alice").should("exist");
  });
});
