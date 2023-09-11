import { getArticlesWithMp3Url } from "../utils/db";

export async function all(context) {
  const articles = getArticlesWithMp3Url();

  return new Response(JSON.stringify(articles), {
    headers: {
      "Content-Type": "application/json",
    },
  });
}
