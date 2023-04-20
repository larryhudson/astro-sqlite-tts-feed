import { extract } from "@extractus/article-extractor";
import { convert } from "html-to-text";

export async function extractArticle(url) {
  const article = await extract(url);
  const text = convert(article.content, {
    wordwrap: 0,
    selectors: [
      {
        selector: "h1",
        options: {
          uppercase: false,
        },
      },
      {
        selector: "h2",
        options: {
          uppercase: false,
        },
      },
      {
        selector: "h3",
        options: {
          uppercase: false,
        },
      },
      {
        selector: "a",
        options: {
          ignoreHref: true,
        },
      },
      {
        selector: "figure",
        format: "skip",
      },
      {
        selector: "img",
        format: "skip",
      },
      {
        selector: "figcaption",
        format: "skip",
      },
    ],
  });

  console.log(text);
  return text;
}
