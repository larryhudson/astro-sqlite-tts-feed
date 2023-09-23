import { extract, addTransformations } from "@extractus/article-extractor";
import { convert } from "html-to-text";
import cheerio from "cheerio";
import fsPromises from "fs/promises";
import fs from "fs";

function convertHtmlToText(html) {
  const text = convert(html, {
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

  return text;
}

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

  const articleTitle = article.title;
  const articleHtml = article.content;

  const tmpHtmlPath = "./tmp-html.html";
  await fsPromises.writeFile(tmpHtmlPath, articleHtml);

  const $ = cheerio.load(articleHtml);

  $("div").each((_, divTag) => {
    $(divTag).replaceWith($(divTag).contents());
  });

  const numberOfH1s = $("h1").length;

  const chapterHeadingSelector = numberOfH1s > 1 ? "h1" : "h2";
  console.log({ chapterHeadingSelector });

  const firstTagIsHeading = $("body")
    .children()
    .first()
    .is(chapterHeadingSelector);

  if (!firstTagIsHeading) {
    $("body").prepend(
      `<${chapterHeadingSelector}>${articleTitle}</${chapterHeadingSelector}>`
    );
  }

  const chapters = $(chapterHeadingSelector)
    .map((headingIndex, headingTag) => {
      const contentTags = $(headingTag)
        .nextUntil(chapterHeadingSelector)
        .addBack();

      const contentHtml = $.html(contentTags).trim();

      const tmpChapterPath = `./tmp-html-chapter-${headingIndex}.html`;

      fs.writeFileSync(tmpChapterPath, contentHtml);

      const chapterTitle = $(headingTag).text().trim();

      const chapterText = convertHtmlToText(contentHtml);

      return {
        title: chapterTitle,
        text: chapterText,
      };
    })
    .get();

  console.log(chapters);
  return chapters;
}
