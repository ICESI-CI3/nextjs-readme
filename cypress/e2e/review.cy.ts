describe('Reviews Page', () => {
  const reviewsMock = [
    {
      id: 1,
      rating: 5,
      comment: "Amazing book!",
      book: { id: 111, title: "The Hobbit" },
      user: { id: 10, name: "Alice" }
    },
    {
      id: 2,
      rating: 3,
      text: "It was okay, not great.",
      book: { id: 222, title: "Dune" },
      user: { id: 11, name: "Bob" }
    },
    {
      id: 3,
      rating: 4,
      comment: "Interesting story.",
      book: { id: 333, title: "1984" },
      user: { id: 12, name: "Charlie" }
    }
  ];

  beforeEach(() => {
    cy.intercept('GET', '/api/reviews', {
      statusCode: 200,
      body: reviewsMock
    }).as('getReviews');

    cy.visit('/reviews');
    cy.wait('@getReviews');
  });

  it('loads and displays reviews list', () => {
    cy.contains("Reviews").should('exist');
    cy.contains("The Hobbit").should('exist');
    cy.contains("Dune").should('exist');
    cy.contains("1984").should('exist');
    cy.contains("Amazing book!").should('exist');
  });

  it('filters reviews by search term', () => {
    cy.get('input[placeholder="Search reviews, books, or readers"]').type('hobbit');
    cy.contains("The Hobbit").should('exist');
    cy.contains("Dune").should('not.exist');
  });

  it('filters reviews by rating', () => {
    cy.get('select').select('5'); 
    cy.contains("The Hobbit").should('exist'); 
    cy.contains("Dune").should('not.exist');
    cy.contains("1984").should('not.exist'); 
  });

  it('navigates to create new review page', () => {
    cy.contains("Add review").click();
    cy.url().should('include', '/reviews/new');
  });

  // ✅ Ver detalle
  it('navigates to review details', () => {
    cy.contains("The Hobbit")
      .parent() // row
      .parent()
      .find("a")
      .contains("View")
      .click();

    cy.url().should('include', '/reviews/1');
  });

  it('paginates correctly', () => {
    const manyReviews = Array.from({ length: 25 }).map((_, i) => ({
      id: i + 1,
      rating: 4,
      comment: `Review ${i + 1}`,
      book: { id: i, title: `Book ${i + 1}` },
      user: { id: i, name: `User ${i + 1}` }
    }));

    cy.intercept('GET', '/api/reviews', {
      statusCode: 200,
      body: manyReviews
    }).as('getManyReviews');

    cy.reload();
    cy.wait('@getManyReviews');

    cy.contains("Review 1").should('exist');
    cy.contains("Review 11").should('not.exist');

    cy.contains("Next").click();

    cy.contains("Review 11").should('exist');
    cy.contains("Review 1").should('not.exist');
  });

  it('shows error toast if API fails', () => {
    cy.intercept('GET', '/api/reviews', {
      statusCode: 500,
      body: { message: "Server error" }
    }).as('getReviewsError');

    cy.visit('/reviews');
    cy.wait('@getReviewsError');

    cy.contains("Unable to load reviews").should('exist');
  });
});
