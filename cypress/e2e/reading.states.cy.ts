describe("Reading - States", () => {
  beforeEach(() => {
    cy.uiLogin("reader");

    cy.intercept("GET", "**/reading-states/**", {
      statusCode: 200,
      body: [
        {
          id: "rs1",
          bookId: "b1",
          status: "to-read",
          book: { title: "Clean Code" },
          origin: "remote",
        },
      ],
    }).as("listStates");

    cy.visit("/reading");
  });

  it("shows list and can upsert state", () => {
    cy.wait("@listStates");

    // Make sure the initial state is displayed
    cy.contains("Clean Code").should("exist");
    cy.contains("To read").should("exist");

    cy.intercept("PUT", "**/reading-states/**", (req) => {
      // mimic API returning updated state
      req.reply({
        statusCode: 200,
        body: {
          id: "rs1",
          bookId: "b1",
          status: "read",
          book: { title: "Clean Code" },
        },
      });
    }).as("updateState");

    // Find the article for that book and update
    cy.contains("Clean Code")
      .closest("article")
      .within(() => {
        cy.get("select").should("have.value", "to-read"); // the API value
      });

    cy.intercept("PUT", "**/reading-states/**", (req) => {
    console.log("PUT request fired:", req.body);
    }).as("updateState");

    // Check updated text
    cy.contains("Completed").should("exist");
  });
});
