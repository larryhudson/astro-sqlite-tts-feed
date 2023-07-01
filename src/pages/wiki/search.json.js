import wiki from "wikipedia";

export async function get({url}) {
  const searchQuery = url.searchParams.get('q');
  const searchResult = await wiki.search(searchQuery, {suggestion: true, limit: 10});

  return new Response(
    JSON.stringify(searchResult),
    {headers:
      {'Content-Type': 'application/json'}
    })
}
