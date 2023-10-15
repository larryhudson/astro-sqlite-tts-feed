import { getUserIdFromSessionKey } from "./utils/auth";

// This function checks if a given URL matches a pattern.
function matchesPattern(url, pattern) {
  const regex = new RegExp(
    "^" + pattern.replace(/:[a-zA-Z0-9_]+/g, "([a-zA-Z0-9_-]+)") + "$",
  );
  return regex.test(url);
}

export async function onRequest(context, next) {
  const currentUrl = context.url.pathname;
  console.log("currentUrl", currentUrl);
  // context includes locals, url, cookies
  const publicUrls = ["/", "/auth/login/"];
  const isPublicUrl = publicUrls.includes(currentUrl);
  const urlsWithAuthTokens = ["/feeds/:id/rss.xml", "/articles/:id/audio.mp3"];
  const isUrlWithAuthToken = urlsWithAuthTokens.some((urlPattern) =>
    matchesPattern(currentUrl, urlPattern),
  );
  // in here, get the current user by reading the session cookie
  const sessionKey = context.cookies.get(
    "astro-sqlite-tts-feed-session",
  )?.value;
  console.log({ sessionKey });
  const userId = await getUserIdFromSessionKey(sessionKey);
  console.log({ userId });

  // if the current URL is not a public URL, and the user isn't logged in, redirect to the login page
  const isLoggedIn = userId !== null;
  const shouldRedirect = !isPublicUrl && !isUrlWithAuthToken && !isLoggedIn;

  if (shouldRedirect) {
    return context.redirect("/auth/login/");
  }

  context.locals.userId = userId;

  // return a Response or the result of calling `next()`
  return next();
}
