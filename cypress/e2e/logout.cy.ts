describe('Logout flow', () => {
  beforeEach(() => {
    localStorage.setItem('token', 'fake-jwt-token');
    cy.setCookie('token', 'fake');
    cy.setCookie('role', 'reader');

    cy.intercept('GET', '**/users/me', {
      statusCode: 200,
      body: { user: { name: 'Alice', email: 'alice@example.com', role: 'reader' } },
    }).as('getProfile');

    cy.intercept('POST', '**/users/logout', {
      statusCode: 200,
      body: { message: 'Logged out' },
    }).as('logoutUser');

    cy.visit('/dashboard');
    cy.wait('@getProfile');
  });

  it('should log out and redirect to login', () => {
    cy.contains('Logout').should('be.visible').click();

    cy.wait('@logoutUser').its('response.statusCode').should('eq', 200);

    cy.url().should('include', '/login');

    cy.window().then((win) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expect(win.localStorage.getItem('token')).to.be.null;
    });

    cy.getCookie('token').should('not.exist');
    cy.getCookie('role').should('not.exist');
  });
});
