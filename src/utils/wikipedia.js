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


function getCostEstimate(numChars) {
  const AUD_PER_CHARACTER = 0.000024241;
  const costUnrounded = numChars * AUD_PER_CHARACTER;
  const costRounded = Math.round(costUnrounded * 100) / 100;
  return costRounded;
}

export async function getWikiPageSections(pageId) {

  const page = await wiki.page(pageId);

  const content = await page.html();

  const $ = cheerio.load(content);

  const headingSelector = "h1,h2,h3,h4,h5,h6";

  // TODO: this stuff is hacky!

  const firstHeading = $(headingSelector).first();

  const topLevelParentOfFirstHeading = $(firstHeading).parentsUntil('.toc').last().parent();

  const firstTag = $(topLevelParentOfFirstHeading).prevAll().last();

  const firstSectionContentTags = $(firstTag).nextUntil(topLevelParentOfFirstHeading);

  // TODO: make this a function

  const firstSectionLinks = $(firstSectionContentTags).find('a[href^="/wiki/"][title]').map((_, aTag) => {
      const title = $(aTag).attr('title');
      const url = $(aTag).attr('href');

      return {title, url}
    }).get();

  const firstSectionTitle = 'Introduction';

    const firstSectionContent = $.html(firstSectionContentTags);

    const firstSectionText = $.text(firstSectionContentTags);
    const firstSectionTextLength = firstSectionText.length;

    const firstSectionCostEstimateAud = getCostEstimate(firstSectionTextLength);

  const firstSection = {
      title: firstSectionTitle,
      content: firstSectionContent,
      textLength: firstSectionTextLength,
      costEstimateAud: firstSectionCostEstimateAud,
      links: firstSectionLinks,
    }

  const headingSections = $(headingSelector).map((_, headingTag) => {

    const title = $(headingTag).text();

    const contentTags = $(headingTag).nextUntil(headingSelector).addBack();

    const links = $(contentTags).find('a[href^="/wiki/"][title]').map((_, aTag) => {
      const title = $(aTag).attr('title');
      const url = $(aTag).attr('href');

      return {title, url}
    }).get();

    const sectionContent = $.html(contentTags);

    const sectionText = $.text(contentTags);
    const textLength = sectionText.length;

    const costEstimateAud = getCostEstimate(textLength);

    return {
      title,
      content: sectionContent,
      textLength,
      costEstimateAud,
      links,
    }

  }).get();

  const allSections = [firstSection, ...headingSections];

  const totalCostEstimateAud = allSections.reduce((previousSum, currentSection) => {
    return previousSum + currentSection.costEstimateAud;
  }, 0);
  
  return {
    pageSections: allSections,
    totalCostEstimateAud
  };
}
