import { getWikiPageLinks } from "../../../utils/wikipedia";

export async function get({ params }) {
  const { pageId } = params;

  const links = await getWikiPageLinks(pageId);

  return new Response(JSON.stringify({ links }), {
    headers: { "Content-Type": "application/json" },
  });
}
