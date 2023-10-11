import { getArticlesWithMp3UrlForFeed } from "../utils/db";

export async function all(context) {
  const articles = getArticlesWithMp3UrlForFeed(1);

  return new Response(JSON.stringify(articles), {
    headers: {
      "Content-Type": "application/json",
    },
  });
}
