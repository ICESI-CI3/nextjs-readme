describe('Register Page', () => {
  beforeEach(() => {
    cy.visit('/register');
  });

  it('should display register form', () => {
    cy.contains('Create your account').should('exist');
    cy.get('input[placeholder="Your full name"]').should('exist');
    cy.get('button[type="submit"]').should('contain.text', 'Create account');
  });

  it('should show error if passwords do not match', () => {
    cy.get('input[placeholder="Your full name"]').type('Alice');
    cy.get('input[placeholder="Pick a unique username"]').type('alice1');
    cy.get('input[placeholder="you@example.com"]').type('alice@example.com');
    cy.get('input[placeholder="******"]').eq(0).type('123456');
    cy.get('input[placeholder="******"]').eq(1).type('654321');
    cy.get('button[type="submit"]').click();

    cy.contains('Passwords do not match.').should('exist');
  });

  it('should register successfully (mock API)', () => {
    cy.intercept('POST', '/api/users/register', {
      statusCode: 201,
      body: { message: 'User created' },
    }).as('registerUser');

    cy.get('input[placeholder="Your full name"]').type('Bob');
    cy.get('input[placeholder="Pick a unique username"]').type('bob1');
    cy.get('input[placeholder="you@example.com"]').type('bob@example.com');
    cy.get('input[placeholder="******"]').eq(0).type('123456');
    cy.get('input[placeholder="******"]').eq(1).type('123456');
    cy.get('button[type="submit"]').click();

    cy.wait('@registerUser');
    cy.contains('Account created. Redirecting you to login.').should('exist');
  });
});
