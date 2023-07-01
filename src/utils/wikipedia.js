import wiki from "wikipedia";
import cheerio from "cheerio";

export async function getWikiSearchResults(searchQuery) {
  const searchResult = await wiki.search(searchQuery, {suggestion: true, limit: 10});

  return searchResult.results;
}

export async function getWikiPageLinks(pageId) {
  const page = await wiki.page(pageId);

  const content = await page.html();

  console.log(content);

  const $ = cheerio.load(content);

  const links = $('a[href^="/wiki/"][title]').map((_, aTag) => {
    const title = $(aTag).attr('title');
    const url = $(aTag).attr('href');

    return {title, url}
  }).get();

  return links;
}

export async function getWikiPageSections(pageId) {

  const page = await wiki.page(pageId);

  const content = await page.html();

  const $ = cheerio.load(content);

  const headingSelector = "h1,h2,h3,h4,h5,h6";

  const headingSections = $(headingSelector).map((_, headingTag) => {

    const contentTags = $(headingTag).nextUntil(headingSelector).addBack();

    const links = $(contentTags).find('a[href^="/wiki/"][title]').map((_, aTag) => {
      const title = $(aTag).attr('title');
      const url = $(aTag).attr('href');

      return {title, url}
    }).get();

    const sectionContent = $.html(contentTags);

    const sectionText = $.text(contentTags);

    return {
      content: sectionContent,
      textLength: sectionText.length,
      links,
    }

  }).get();
  
  return headingSections;
}
