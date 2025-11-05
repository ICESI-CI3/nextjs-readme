/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Cypress {
    interface Chainable {
      uiLogin(role?: "reader" | "admin"): Chainable<void>;
    }
  }
}

Cypress.Commands.add("uiLogin", (role = "reader") => {
  const token = "fake-jwt-token-" + role;
  const user =
    role === "admin"
      ? { id: "u-admin", name: "Admin", email: "admin@site.com", role: "admin" }
      : { id: "u-reader", name: "Reader", email: "reader@site.com", role: "reader" };

  cy.intercept("POST", "**/api/users/login", {
    statusCode: 200,
    body: { token, user },
  }).as("login");

  cy.intercept("GET", "**/api/users/me", {
    statusCode: 200,
    body: user,
  }).as("me");

  cy.visit("/login");
  cy.get('input[type="email"]').type(user.email);
  cy.get('input[type="password"]').type("123456");
  cy.get('button[type="submit"]').click();
  cy.wait("@login");
});


export {};
