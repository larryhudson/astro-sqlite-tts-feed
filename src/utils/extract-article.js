import { extract, addTransformations } from "@extractus/article-extractor";
import { convert } from "html-to-text";
import cheerio from "cheerio";
import fsPromises from "fs/promises";
import fs from "fs";
import { parse as markedParse } from "marked";
import articleTitle from "article-title";
import pMap from "p-map";

import { getExtractionRulesForDomain } from "./db.js";

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
  const domain = new URL(url).hostname;

  const globalRules = getExtractionRulesForDomain(null);
  const globalSelectorsToRemove = globalRules
    .filter((rule) => rule.rule_type === "delete_selector")
    .map((rule) => rule.content);
  const domainRules = getExtractionRulesForDomain(domain);
  const domainSelectorsToRemove = domainRules
    .filter((rule) => rule.rule_type === "delete_selector")
    .map((rule) => rule.content);

  console.log({ globalSelectorsToRemove, domainSelectorsToRemove });

  function removeSelectors(document, selectors) {
    selectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((elem) => {
        elem.parentNode.removeChild(elem);
      });
    });

    return document;
  }

  addTransformations({
    patterns: [/./],
    pre: (document) => removeSelectors(document, globalSelectorsToRemove),
  });

  const domainRegex = new RegExp(`([\\w]+.)?${domain.replace(/\./g, "\\.")}/?`);

  addTransformations({
    patterns: [domainRegex],
    pre: (document) => removeSelectors(document, domainSelectorsToRemove),
  });

  const article = await extract(url);

  const thisArticleTitle = article.title;
  console.log({ thisArticleTitle });
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
      `<${chapterHeadingSelector}>${thisArticleTitle}</${chapterHeadingSelector}>`,
    );
  }

  async function getRelatedLinkInfo(aTag) {
    let title = "";
    const href = $(aTag).attr("href");
    try {
      const linkResponse = await fetch(href);
      const linkHtml = await linkResponse.text();
      title = articleTitle(linkHtml);
    } catch (e) {
      console.log("Error fetching this URL HTML");
      console.log(href);
      console.log(e);
    }

    const contextQuote = $(aTag).closest("p,li").text().trim();

    return {
      url: href,
      title,
      contextQuote,
    };
  }

  const linkTags = $("a");
  const relatedLinks = await pMap(linkTags, getRelatedLinkInfo, {
    concurrency: 2,
  });

  console.log("Related links:");
  console.log(relatedLinks);

  const articleChapters = $(chapterHeadingSelector)
    .map((headingIndex, headingTag) => {
      const contentTags = $(headingTag).nextUntil(chapterHeadingSelector);

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

  console.log(articleChapters);
  return {
    articleChapters,
    relatedLinks,
  };
}

export function getChaptersFromMarkdownContent(markdownContent) {
  // convert markdown to html
  const html = markedParse(markdownContent);

  const $ = cheerio.load(html);

  const numHeadings = $("h2").length;

  if (numHeadings === 0) {
    const text = convertHtmlToText(html);
    return [
      {
        title: "",
        text,
      },
    ];
  }

  const chapters = $("h2")
    .map((headingIndex, headingTag) => {
      const contentTags = $(headingTag).nextUntil("h2").addBack();

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

  return chapters;
}

export async function getArticleTitleFromUrl(url) {
  const response = await fetch(url);
  const html = await response.text();

  const title = articleTitle(html);

  return title;
}
