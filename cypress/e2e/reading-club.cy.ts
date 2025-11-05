
describe('Reading Clubs Page', () => {
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
  const clubsMock = [
    {
      id: 1,
      name: "Fantasy Readers",
      description: "We read epic fantasy.",
      currentBook: { id: 22, title: "The Hobbit" },
      members: [{ id: 10, name: "Alice" }],
      ownerId: 99
    },
    {
      id: 2,
      name: "SciFi Society",
      description: "Exploring the universe.",
      currentBook: { id: 33, title: "Dune" },
      members: [],
      ownerId: 50
    }
  ];

  const userMock = {
    id: 10,
    name: "Alice",
    role: "reader"
  };

  beforeEach(() => {
    localStorage.setItem(
      "auth-storage",
      JSON.stringify({ state: { user: userMock } })
    );

    cy.intercept("GET", api.clubs, {
      statusCode: 200,
      body: clubsMock,
    }).as("getClubs");

    cy.visit("/clubs");
    cy.wait("@getClubs");
  });

  it("loads and displays clubs", () => {
    cy.contains("Fantasy Readers").should("exist");
    cy.contains("SciFi Society").should("exist");
    cy.contains("The Hobbit").should("exist");
    cy.contains("Dune").should("exist");
  });

  it("filters clubs by search", () => {
    cy.get('input[placeholder="Filter by name, description, or current book"]')
      .type("Fantasy");

    cy.contains("Fantasy Readers").should("exist");
    cy.contains("SciFi Society").should("not.exist");
  });

  it("joins a club", () => {
    cy.intercept("POST", `${api.clubs}/2/join`, {
      statusCode: 200,
      body: { message: "joined" },
    }).as("joinClub");

    cy.contains("SciFi Society")
      .parent()
      .find("button")
      .contains("Join")
      .click();

    cy.wait("@joinClub");
    cy.contains("Joined club successfully.").should("exist");
  });

  it("leaves a club", () => {
    cy.intercept("PUT", `${api.clubs}/1`, {
      statusCode: 200,
      body: { message: "left" },
    }).as("leaveClub");

    cy.contains("Fantasy Readers")
      .parent()
      .find("button")
      .contains("Leave")
      .click();

    cy.wait("@leaveClub");
    cy.contains("Left club successfully.").should("exist");
  });

  it("deletes a club when user is owner", () => {
    localStorage.setItem(
      "auth-storage",
      JSON.stringify({ state: { user: { ...userMock, role: "admin" } } })
    );

    cy.reload();
    cy.wait("@getClubs");

    cy.intercept("DELETE", `${api.clubs}/1`, {
      statusCode: 200,
      body: { message: "deleted" },
    }).as("deleteClub");

    cy.contains("Fantasy Readers")
      .parent()
      .find("button")
      .contains("Delete")
      .click();

    cy.wait("@deleteClub");
    cy.contains("Club deleted.").should("exist");
  });
});
