describe('Login Page', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  it('should display login form', () => {
    cy.contains('Compunet Reads').should('exist');
    cy.get('input[placeholder="you@example.com"]').should('exist');
    cy.get('button[type="submit"]').should('contain.text', 'Log in');
  });

  it('should show error if credentials are invalid', () => {
    cy.intercept('POST', '/api/users/login', {
      statusCode: 401,
      body: { message: 'Invalid credentials' },
    }).as('loginFail');

    cy.get('input[placeholder="you@example.com"]').type('wrong@example.com');
    cy.get('input[placeholder="******"]').type('badpass');
    cy.get('button[type="submit"]').click();

    cy.wait('@loginFail');
    cy.contains('Invalid credentials').should('exist');
  });

  it('should log in successfully (mock)', () => {
    cy.intercept('POST', '/api/users/login', {
      statusCode: 200,
      body: { token: 'fake-jwt-token' },
    }).as('loginSuccess');

    cy.get('input[placeholder="you@example.com"]').type('alice@example.com');
    cy.get('input[placeholder="******"]').type('123456');
    cy.get('button[type="submit"]').click();

    cy.wait('@loginSuccess');
    cy.url().should('include', '/dashboard');
  });
});
