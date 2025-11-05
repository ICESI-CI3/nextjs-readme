export type GoogleVolume = {
  id?: string;
  volumeInfo?: {
    title?: string;
    authors?: string[];
    description?: string;
    publisher?: string;
    publishedDate?: string;
    pageCount?: number;
    categories?: string[];
    printType?: string;
    imageLinks?: {
      small?: string;
      thumbnail?: string;
      smallThumbnail?: string;
      medium?: string;
      large?: string;
    };
    previewLink?: string;
    infoLink?: string;
    industryIdentifiers?: Array<{ type?: string; identifier?: string }>;
  };
};

export const extractIsbn = (volume: GoogleVolume) => {
  const ids = volume.volumeInfo?.industryIdentifiers ?? [];
  const prioritized = ids
    .filter((x): x is { type?: string; identifier?: string } =>
      Boolean(x?.identifier)
    )
    .sort((a, b) => {
      const w = (t?: string) => {
        const n = (t || "").toLowerCase();
        if (n.includes("isbn_13") || n.includes("isbn13")) return 1;
        if (n.includes("isbn_10") || n.includes("isbn10")) return 2;
        return 3;
      };
      return w(a.type) - w(b.type);
    });
  return prioritized[0]?.identifier ?? null;
};

export const extractCover = (volume: GoogleVolume) => {
  const links = volume.volumeInfo?.imageLinks;
  return (
    links?.large ?? links?.medium ?? links?.thumbnail ?? links?.small ?? null
  );
};
