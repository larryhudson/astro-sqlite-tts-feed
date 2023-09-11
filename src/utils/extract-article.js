import { extract, addTransformations } from "@extractus/article-extractor";
import { convert } from "html-to-text";
import cheerio from "cheerio";

export async function extractArticle(url) {
  addTransformations({
    patterns: [/([\w]+.)?wikipedia.org\/*/],
    // */
    pre: (document) => {
      // do something with document
      const selectorsToRemove = [
        "figure",
        "img",
        "figcaption",
        "sup.reference",
        "sup.noprint",
        "div.thumb",
        "table.infobox",
        "ol.references",
        ".mw-editsection",
      ];

      selectorsToRemove.forEach((selector) => {
        document.querySelectorAll(selector).forEach((elem) => {
          elem.parentNode.removeChild(elem);
        });
      });

      return document;
    },
    post: (document) => {
      // do something with document
      return document;
    },
  });

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
    ],
  });

  console.log(text);
  return text;
}
