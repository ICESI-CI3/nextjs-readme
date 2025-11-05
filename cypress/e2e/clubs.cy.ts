describe("Reading Clubs - Admin & Reader flows", () => {
  it("admin can create, edit and delete a club", () => {
    cy.uiLogin("admin");

    cy.intercept("GET", "**/reading-clubs", {
      statusCode: 200,
      body: [],
    }).as("listClubs");

    cy.visit("/clubs");
    cy.wait("@listClubs");

    cy.intercept("POST", "**/reading-clubs", {
      statusCode: 201,
      body: {
        id: "c1",
        name: "Club Clean Code",
        description: "weekly",
        bookId: "b1",
      },
    }).as("createClub");

    cy.contains("New Club").click();
    cy.get('input[name="name"]').type("Club Clean Code");
    cy.get('textarea[name="description"]').type("weekly");
    cy.get('select[name="bookId"]').select("b1");
    cy.get('button[type="submit"]').click();
    cy.wait("@createClub");
    cy.contains("Club Clean Code").should("exist");

    cy.intercept("PATCH", "**/reading-clubs/c1", {
      statusCode: 200,
      body: {
        id: "c1",
        name: "Club Clean Code+",
        description: "biweekly",
        bookId: "b1",
      },
    }).as("updateClub");

    cy.contains("Club Clean Code")
      .parents('[data-testid="club-row"]')
      .within(() => {
        cy.contains("Edit").click();
      });
    cy.get('input[name="name"]').clear().type("Club Clean Code+");
    cy.get('textarea[name="description"]').clear().type("biweekly");
    cy.get('button[type="submit"]').click();
    cy.wait("@updateClub");
    cy.contains("Club Clean Code+").should("exist");

    cy.intercept("DELETE", "**/reading-clubs/c1", {
      statusCode: 200,
      body: { ok: true },
    }).as("delClub");
    cy.contains("Club Clean Code+")
      .parents('[data-testid="club-row"]')
      .within(() => {
        cy.contains("Delete").click();
      });
    cy.wait("@delClub");
    cy.contains("Club Clean Code+").should("not.exist");
  });

  it("reader can see clubs, join, start a debate and add a message (if allowed)", () => {
    cy.uiLogin("reader");

    cy.intercept("GET", "**/reading-clubs", {
      statusCode: 200,
      body: [
        { id: "c2", name: "Pragmatic Club", description: "open", bookId: "b2" },
      ],
    }).as("clubs");
    cy.visit("/clubs");
    cy.wait("@clubs");

    cy.intercept("POST", "**/reading-clubs/c2/join/*", {
      statusCode: 200,
      body: { id: "c2", name: "Pragmatic Club", joined: true },
    }).as("join");
    cy.contains("Pragmatic Club")
      .parents('[data-testid="club-row"]')
      .within(() => {
        cy.contains("Join").click();
      });
    cy.wait("@join");
    cy.contains("Joined").should("exist"); // o el estado que muestre tu UI

    // ir a detalle
    cy.intercept("GET", "**/reading-clubs/c2", {
      statusCode: 200,
      body: { id: "c2", name: "Pragmatic Club", bookId: "b2" },
    }).as("clubDetail");

    cy.contains("Pragmatic Club").click();
    cy.url().should("include", "/clubs/c2");
    cy.wait("@clubDetail");

    // iniciar debate (si tu back lo permite a miembros)
    cy.intercept("POST", "**/reading-clubs/c2/debates", {
      statusCode: 201,
      body: { id: "d1", title: "Cap 1", clubId: "c2", messages: [] },
    }).as("startDebate");

    cy.contains("Start Debate").click();
    cy.get('input[name="title"]').type("Cap 1");
    cy.get('button[type="submit"]').click();
    cy.wait("@startDebate");
    cy.contains("Cap 1").should("exist");

    cy.intercept("POST", "**/reading-clubs/debates/d1/messages", {
      statusCode: 201,
      body: {
        id: "m1",
        content: "¡Qué buen inicio!",
        userId: "u-reader",
        debateId: "d1",
      },
    }).as("addMsg");

    cy.get('textarea[name="message"]').type("¡Qué buen inicio!");
    cy.contains("Send").click();
    cy.wait("@addMsg");
    cy.contains("¡Qué buen inicio!").should("exist");
  });
});
