describe("Reports Page", () => {

    const api = {
        books: "/api/books",
        clubs: "/api/clubs",
        reviews: "/api/reviews",
        readingStates: "/api/reading-states",
        mostRead: "/api/reports/most-read",
        mostCommented: "/api/reports/most-commented",
        topReader: "/api/reports/top-reader",
        userStats: "/api/reports/user-stats",
        auth: "/api/auth/me",
    };

  const mockUser = {
    id: 1,
    username: "admin",
    email: "admin@example.com",
    role: "admin",
  };

  const mockStats = [
    {
      id: 1,
      username: "User A",
      email: "a@example.com",
      booksRead: 3,
      booksToRead: 1,
      reviewsCount: 2,
    },
    {
      id: 2,
      username: "User B",
      email: "b@example.com",
      booksRead: 1,
      booksToRead: 5,
      reviewsCount: 1,
    },
  ];

  const mockMostRead = { title: "Book X", reads: 10 };
  const mockMostCommented = { title: "Book Y", comments: 7 };
  const mockTopReader = { username: "User A", booksRead: 3 };

  beforeEach(() => {
    cy.window().then((win) => {
      win.localStorage.setItem(
        "auth",
        JSON.stringify({
          user: mockUser,
          initialized: true,
        })
      );
    });
  });

  const mockAllGood = () => {
    cy.intercept("GET", api.userStats, mockStats).as("stats");
    cy.intercept("GET", api.mostRead, mockMostRead).as("mostRead");
    cy.intercept("GET", api.mostCommented, mockMostCommented).as("mostCommented");
    cy.intercept("GET", api.topReader, mockTopReader).as("topReader");
  };

  it("loads and displays reports correctly", () => {
    mockAllGood();
    cy.visit("/dashboard/reports");

    cy.wait(["@stats", "@mostRead", "@mostCommented", "@topReader"]);

    cy.contains("Most read book").should("exist");
    cy.contains("Book X").should("exist");

    cy.contains("Most commented book").should("exist");
    cy.contains("Book Y").should("exist");

    cy.contains("Top reader").should("exist");
    cy.contains("User A").should("exist");

    cy.contains("User A").should("exist");
    cy.contains("3").should("exist");
  });

  it("shows skeleton loaders while loading", () => {
    cy.intercept("GET", api.userStats, (req) => {
      req.on("response", () => {
        // intentional delay
      });
    }).as("slowStats");

    cy.visit("/dashboard/reports");
    cy.get(".animate-pulse").should("have.length.at.least", 1);
  });

  it("handles partial failures with describeError", () => {
    cy.intercept("GET", api.userStats, {
      statusCode: 500,
      body: { message: "Stats failed" },
    }).as("statsFail");

    cy.intercept("GET", api.mostRead, mockMostRead).as("mr");
    cy.intercept("GET", api.mostCommented, mockMostCommented).as("mc");
    cy.intercept("GET", api.topReader, mockTopReader).as("tr");

    cy.visit("/dashboard/reports");
    cy.contains("Some metrics failed to load: Stats failed").should("exist");
  });

  it("handles all failures gracefully", () => {
    cy.intercept("GET", "/api/reports/*", {
      statusCode: 500,
      body: { message: "Fatal error" },
    }).as("allFail");

    cy.visit("/dashboard/reports");
    cy.contains("Some metrics failed to load: Fatal error").should("exist");
  });

  it("refresh button reloads data", () => {
    mockAllGood();
    cy.visit("/dashboard/reports");
    cy.wait(["@stats", "@mostRead", "@mostCommented", "@topReader"]);

    cy.intercept("GET", api.mostRead, { title: "Book Z", reads: 20 }).as("newMR");

    cy.contains("Refresh").click();
    cy.wait("@newMR");
    cy.contains("Book Z").should("exist");
  });

  it("blocks non-admin users", () => {
    cy.window().then((win) => {
      win.localStorage.setItem(
        "auth",
        JSON.stringify({
          user: { role: "user" },
          initialized: true,
        })
      );
    });

    cy.visit("/dashboard/reports");
    cy.contains("restricted to administrator").should("exist");
  });
});
