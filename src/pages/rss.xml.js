import { getArticlesWithMp3Url } from "../utils/db";

export async function all(context) {
  const articles = getArticlesWithMp3Url();
  const podcast = {
    title: "TTS Feed",
    author: "Larry Hudson",
    authorEmail: "larryhudson@hey.com",
    category: "Technology",
    description: "A podcast feed for the TTS Feed",
    feedUrl: "http://tts-feed.larryhudson.io/rss.xml",
    homeUrl: "http://tts-feed.larryhudson.io",
    imageUrl: "http://tts-feed.larryhudson.io/assets/images/astro.png",
    language: "en",
    location: "Torquay, Australia",
    frequency: "Weekly",
    keywords: "podcast, rss, feed",
    pubDate: new Date().toUTCString(),
    site: "http://tts-feed.larryhudson.io",
  };

  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss xmlns:googleplay="http://www.google.com/schemas/play-podcasts/1.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:rawvoice="http://www.rawvoice.com/rawvoiceRssModule/" xmlns:content="http://purl.org/rss/1.0/modules/content/" version="2.0">
  <channel>
    <title>${podcast.title}</title>
    <ttl>1</ttl>
    <googleplay:author>${podcast.author}</googleplay:author>
    <rawvoice:rating>TV-G</rawvoice:rating>
    <rawvoice:location>${podcast.location}</rawvoice:location>
    <rawvoice:frequency>${podcast.frequency}</rawvoice:frequency>
    <author>${podcast.author}</author>
    <itunes:author>${podcast.author}</itunes:author>
    <itunes:email>${podcast.authorEmail}</itunes:email>
    <itunes:category text="${podcast.category}" />
    <image>
      <url>${podcast.imageUrl}</url>
      <title>${podcast.title}</title>
      <link>${podcast.homeUrl}</link>
    </image>
    <itunes:owner>
      <itunes:name>${podcast.author}</itunes:name>
      <itunes:email>${podcast.authorEmail}</itunes:email>
    </itunes:owner>
    <itunes:keywords>${podcast.keywords}</itunes:keywords>
    <copyright>${podcast.author}</copyright>
    <description>${podcast.description}</description>
    <googleplay:image href="${podcast.imageUrl}" />
    <language>${podcast.language}</language>
    <itunes:explicit>no</itunes:explicit>
    <pubDate>${podcast.pubDate}</pubDate>
    <link>${podcast.feedUrl}</link>
    <itunes:image href="${podcast.imageUrl}" />
    ${articles.map(
      (article) =>
        `<item>
        <author>${podcast.author}</author>
        <itunes:author>${podcast.author}</itunes:author>
        <title>${article.title}</title>
        <pubDate>${new Date(article.added_at).toUTCString()}</pubDate>
        <enclosure url="${podcast.site}${
          article.mp3Url
        }" type="audio/mpeg" length="${article.mp3Length}" />
        <itunes:duration>${article.mp3Duration}</itunes:duration>
        <guid isPermaLink="false">${article.mp3Url}</guid>
        <itunes:explicit>no</itunes:explicit>
        <description>${article.url}</description>
      </item>`
    )}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml",
    },
  });
}
