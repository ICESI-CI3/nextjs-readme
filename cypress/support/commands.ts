/* eslint-disable @typescript-eslint/no-namespace */
// Requiere "compilerOptions": { "types": ["cypress"] } en tsconfig de cypress
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
      : {
          id: "u-reader",
          name: "Reader",
          email: "reader@site.com",
          role: "reader",
        };

  cy.intercept("POST", "**/auth/login", {
    statusCode: 200,
    body: { token, user },
  }).as("login");

  cy.visit("/login");
  cy.get('input[type="email"]').type(user.email);
  cy.get('input[type="password"]').type("123456");
  cy.get('button[type="submit"]').click();

  cy.wait("@login");
  // si tu app pide /users/me al cargar dashboard:
  cy.intercept("GET", "**/users/me", { statusCode: 200, body: user }).as("me");
});
export {};
/* eslint-enable @typescript-eslint/no-namespace */
