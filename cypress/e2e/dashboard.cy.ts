describe('Dashboard Page', () => {
  const api = {
    me: '/api/users/me',
    books: '/api/books',
    clubs: '/api/clubs',
    reviews: '/api/reviews',
    readingStates: '/api/reading-states',
    mostRead: '/api/reports/most-read',
    mostCommented: '/api/reports/most-commented',
    topReader: '/api/reports/top-reader',
  };

  const visitDashboard = () => cy.visit('/dashboard');

  beforeEach(() => {
    // Mock login/session first
    cy.uiLogin('reader'); // or 'admin' depending on test

    // Mock user API
    cy.intercept('GET', api.me, (req) => {
      req.reply({ statusCode: 200, body: { id: 'u1', name: 'John Doe', role: req.headers['x-role'] || 'reader' } });
    }).as('getUser');

    // Mock metrics
    cy.intercept('GET', api.books, [{ id: 1 }, { id: 2 }, { id: 3 }]).as('getBooks');
    cy.intercept('GET', '/api/reading-clubs', [{ id: 1 }]).as('getClubs');
    cy.intercept('GET', api.reviews, [{ id: 1 }, { id: 2 }]).as('getReviews');
    cy.intercept('GET', api.readingStates, [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]).as('getStates');

    // Mock reports
    cy.intercept('GET', api.mostRead, { title: 'The Hobbit', reads: 42 }).as('getMostRead');
    cy.intercept('GET', api.mostCommented, { title: 'Dune', comments: 18 }).as('getMostCommented');
    cy.intercept('GET', api.topReader, { username: 'Alice', booksRead: 12 }).as('getTopReader');
  });

  it('renders dashboard widgets without reports for reader', () => {
    visitDashboard();

    cy.wait('@getUser');
    cy.wait(['@getBooks', '@getClubs', '@getReviews', '@getStates']);

    cy.contains('Welcome back, John Doe.');
    cy.contains('Books in library').parent().contains('3');
    cy.contains('Reading clubs').parent().contains('1');
    cy.contains('Reviews logged').parent().contains('2');
    cy.contains('Active progress entries').parent().contains('4');

    cy.contains('Quick actions');
    cy.contains('New review');
    cy.contains('New club');
    cy.contains('New book').should('not.exist');
    cy.contains('View reports').should('not.exist');

    cy.contains('Start a new reading entry');
    cy.contains('Engagement insights').should('not.exist');
  });

it('renders dashboard widgets and reports for admin', () => {
    // MOCK THE USER FIRST
    cy.intercept('GET', '/api/users/me', {
      statusCode: 200,
      body: { id: 'u1', name: 'Admin', role: 'admin' },
    }).as('getUser');

    // MOCK THE METRICS
    cy.intercept('GET', '/api/books', [{ id: 1 }, { id: 2 }, { id: 3 }]).as('getBooks');
    cy.intercept('GET', '/api/reading-clubs', [{ id: 1 }]).as('getClubs');
    cy.intercept('GET', '/api/reviews', [{ id: 1 }, { id: 2 }]).as('getReviews');
    cy.intercept('GET', '/api/reading-states', [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]).as('getStates');

    // MOCK THE REPORTS
    cy.intercept('GET', '/api/reports/most-read-book', { title: 'The Hobbit', reads: 42 }).as('getMostRead');
    cy.intercept('GET', '/api/reports/most-commented-book', { title: 'Dune', comments: 18 }).as('getMostCommented');
    cy.intercept('GET', '/api/reports/top-reader', { username: 'Alice', booksRead: 12 }).as('getTopReader');

    // NOW visit the dashboard
    cy.visit('/dashboard');

    // WAIT FOR ALL API REQUESTS
    cy.wait('@getUser');
    cy.wait(['@getBooks', '@getClubs', '@getReviews', '@getStates']);
    cy.wait(['@getMostRead', '@getMostCommented', '@getTopReader']);

    // ASSERT THE DASHBOARD CONTENT
    cy.contains('Engagement insights');
    cy.contains('Most read book').parent().contains('The Hobbit');
    cy.contains('42 completions');
    cy.contains('Most commented book').parent().contains('Dune');
    cy.contains('18 comments');
    cy.contains('Top reader').parent().contains('Alice');
    cy.contains('12 books finished');

    cy.contains('New book');
    cy.contains('View reports');
  });


  it('shows toast when metrics fail', () => {
    cy.intercept('GET', api.books, { statusCode: 500 });
    cy.intercept('GET', api.clubs, { statusCode: 500 });
    cy.intercept('GET', api.reviews, { statusCode: 500 });
    cy.intercept('GET', api.readingStates, { statusCode: 500 });

    visitDashboard();

    cy.contains('Unable to load latest metrics').should('exist');
  });

});
