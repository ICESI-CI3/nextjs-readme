describe("Reading - States", () => {
  beforeEach(() => {
    cy.uiLogin("reader");
    cy.visit("/reading");
  });

  it("shows list and can upsert state", () => {
    cy.intercept("GET", "**/reading-states", {
      statusCode: 200,
      body: [
        {
          id: "rs1",
          bookId: "b1",
          state: "pending",
          book: { title: "Clean Code" },
        },
      ],
    }).as("listStates");

    cy.reload();
    cy.wait("@listStates");
    cy.contains("Clean Code").should("exist");
    cy.contains("Pending").should("exist");

    cy.intercept("POST", "**/reading-states/upsert", {
      statusCode: 200,
      body: {
        id: "rs1",
        bookId: "b1",
        state: "read",
        book: { title: "Clean Code" },
      },
    }).as("upsert");

    cy.contains("Clean Code")
      .parents('[data-testid="reading-row"]')
      .within(() => {
        cy.get('select[name="state"]').select("completed");
        cy.contains("Save").click();
      });

    cy.wait("@upsert");
    cy.contains("Completed").should("exist");
  });
});
