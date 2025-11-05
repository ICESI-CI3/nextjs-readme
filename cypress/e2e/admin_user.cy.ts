describe("Admin Users Page", () => {
    beforeEach(() => {
    cy.intercept("GET", "/admin/users", (req) => {
    req.reply({
        statusCode: 200,
        headers: { "content-type": "text/html" },
        fixture: "admin_users_page.html",
    });
    }).as("page");

    cy.intercept("GET", "/api/users", {
    statusCode: 200,
    body: [
        { id: 1, name: "Alice", email: "alice@test.com", role: "reader", isActive: true },
        { id: 2, name: "Bob", email: "bob@test.com", role: "reader", isActive: true },
    ],
    }).as("getUsers");

    cy.visit("/admin/users");

    cy.wait("@page");
    cy.wait("@getUsers");
    });

  it("renders users table", () => {
    cy.get("[data-testid='users-table']").should("exist");
    cy.contains("Alice");
    cy.contains("Bob");
  });



  it("filters users", () => {
    cy.get("[data-testid='search-users']").type("Alice");
    cy.contains("Alice");
    cy.contains("Bob").should("not.exist");
  });

  it("creates a new user", () => {
    cy.intercept("POST", "/api/users", {
      statusCode: 201,
      body: {
        id: 3,
        name: "Charlie",
        username: "charlie",
        email: "charlie@test.com",
        role: "reader",
        isActive: true,
      },
    }).as("createUser");

    cy.get("[data-testid='create-name']").type("Charlie");
    cy.get("[data-testid='create-username']").type("charlie");
    cy.get("[data-testid='create-email']").type("charlie@test.com");
    cy.get("[data-testid='create-password']").type("123456");
    cy.get("[data-testid='create-role']").select("reader");

    cy.get("[data-testid='create-submit']").click();

    cy.wait("@createUser");
    cy.contains("User created.");
    cy.contains("Charlie");
  });

  it("changes user role", () => {
    cy.intercept("PATCH", "/api/users/1", {
      statusCode: 200,
    }).as("updateRole");

    cy.get("[data-testid='role-1']").select("admin");
    cy.wait("@updateRole");

    cy.contains("Role updated.");
  });

  it("toggles user active state", () => {
    cy.intercept("PATCH", "/api/users/1", {
      statusCode: 200,
    }).as("toggleActive");

    cy.get("[data-testid='toggle-1']").click();
    cy.wait("@toggleActive");

    cy.contains("User disabled.");
  });

  it("deletes a user", () => {
    cy.intercept("DELETE", "/api/users/2", {
      statusCode: 200,
    }).as("deleteUser");

    cy.get("[data-testid='delete-2']").click();
    cy.wait("@deleteUser");

    cy.contains("Bob").should("not.exist");
  });
});
