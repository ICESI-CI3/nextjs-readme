describe('Dashboard Page', () => {
  const api = {
    books: '/api/books',
    clubs: '/api/clubs',
    reviews: '/api/reviews',
    readingStates: '/api/reading-states',
    mostRead: '/api/reports/most-read',
    mostCommented: '/api/reports/most-commented',
    topReader: '/api/reports/top-reader',
    auth: '/api/auth/me',
  };

  const visitDashboard = () => cy.visit('/dashboard');

  const mockUser = (role: 'admin' | 'reader', name = 'John Doe') => {
    cy.intercept('GET', api.auth, {
      statusCode: 200,
      body: { id: 1, name, role },
    });
  };

  const mockMetrics = () => {
    cy.intercept('GET', api.books, [{ id: 1 }, { id: 2 }, { id: 3 }]);
    cy.intercept('GET', api.clubs, [{ id: 1 }]);
    cy.intercept('GET', api.reviews, [{ id: 1 }, { id: 2 }]);
    cy.intercept('GET', api.readingStates, [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]);
  };

  const mockReports = () => {
    cy.intercept('GET', api.mostRead, {
      title: 'The Hobbit',
      reads: 42,
    });
    cy.intercept('GET', api.mostCommented, {
      title: 'Dune',
      comments: 18,
    });
    cy.intercept('GET', api.topReader, {
      username: 'Alice',
      booksRead: 12,
    });
  };

  context('Reader User', () => {
    it('loads dashboard and shows correct widgets', () => {
      mockUser('reader');
      mockMetrics();
      mockReports(); // ignored since reader cannot see them

      visitDashboard();

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

      // next steps for reader
      cy.contains('Start a new reading entry');
    });

    it('does NOT show reports section for reader', () => {
      mockUser('reader');
      mockMetrics();
      mockReports();

      visitDashboard();

      cy.contains('Engagement insights').should('not.exist');
    });
  });

  context('Admin User', () => {
    it('loads dashboard and shows reports section', () => {
      mockUser('admin');
      mockMetrics();
      mockReports();

      visitDashboard();

      cy.contains('Engagement insights');

      cy.contains('Most read book');
      cy.contains('The Hobbit');
      cy.contains('42 completions');

      cy.contains('Most commented book');
      cy.contains('Dune');
      cy.contains('18 comments');

      cy.contains('Top reader');
      cy.contains('Alice');
      cy.contains('12 books finished');

      // quick actions
      cy.contains('New book');
      cy.contains('View reports');
    });

    it('refreshes reports when clicking Refresh metrics', () => {
      mockUser('admin');
      mockMetrics();
      mockReports();

      visitDashboard();

      cy.contains('Refresh metrics').click();

      cy.contains('The Hobbit');
      cy.contains('Dune');
      cy.contains('Alice');
    });

    it('shows reports error when reports API fails', () => {
      mockUser('admin');
      mockMetrics();

      cy.intercept('GET', api.mostRead, { statusCode: 500 });
      cy.intercept('GET', api.mostCommented, { statusCode: 500 });
      cy.intercept('GET', api.topReader, { statusCode: 500 });

      visitDashboard();

      cy.contains('Unable to load reports summary').should('exist');
    });
  });

  context('Errors on main metrics', () => {
    it('shows toast error message when metrics fail', () => {
      mockUser('reader');

      cy.intercept('GET', api.books, { statusCode: 500 });
      cy.intercept('GET', api.clubs, { statusCode: 500 });
      cy.intercept('GET', api.reviews, { statusCode: 500 });
      cy.intercept('GET', api.readingStates, { statusCode: 500 });

      visitDashboard();

      cy.contains('Unable to load latest metrics').should('exist');
    });
  });
});
