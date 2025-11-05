describe("Books - Google Search & Import", () => {
  beforeEach(() => {
    cy.uiLogin("admin"); // o reader si tu back permite importar como reader
    cy.visit("/books/search");
  });

  it("searches on Google Books and imports a volume into local catalog", () => {
    // mock búsqueda a Google Books
    cy.intercept("GET", /googleapis\.com\/books\/v1\/volumes.*/, {
      statusCode: 200,
      body: {
        items: [
          {
            id: "vol123",
            volumeInfo: {
              title: "Refactoring",
              authors: ["Martin Fowler"],
              imageLinks: { thumbnail: "http://example.com/img.jpg" },
              publishedDate: "2018",
            },
          },
        ],
      },
    }).as("gbooks");

    cy.get('input[placeholder="Search Google Books"]').type(
      "Refactoring{enter}"
    );
    cy.wait("@gbooks");
    cy.contains("Refactoring").should("exist");

    // mock importación al backend local
    cy.intercept("POST", "**/books/google/import", {
      statusCode: 201,
      body: { id: "b100", title: "Refactoring", authors: ["Martin Fowler"] },
    }).as("importBook");

    cy.contains("Import").click();
    cy.wait("@importBook").its("response.statusCode").should("eq", 201);
    cy.contains("Imported").should("exist"); // o el toaster equivalente
  });
});
