if (typeof import.meta.env.APP_PASSWORD === "undefined") {
  throw new Error(
    "APP_PASSWORD environment variable is not defined. Please define it.",
  );
}

const APP_PASSWORD = import.meta.env.APP_PASSWORD;

export function checkLoggedIn(Astro) {
  const passwordCookie = Astro.cookies.get("astro-sqlite-tts-feed-password");
  if (!passwordCookie) return false;

  const password = passwordCookie.value;

  return password === APP_PASSWORD;
}

export function getPasswordFromAstro(Astro) {
  const passwordCookie = Astro.cookies.get("astro-sqlite-tts-feed-password");
  if (!passwordCookie) return false;

  const password = passwordCookie.value;

  return password;
}

export function checkPassword(password) {
  return password === APP_PASSWORD;
}

export function setPasswordCookie(Astro, password) {
  Astro.cookies.set("astro-sqlite-tts-feed-password", password, {
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
    sameSite: "lax",
    secure: true,
    httpOnly: true,
  });
}

export function addPasswordParamToUrl(url, password) {
  const searchParams = new URLSearchParams();
  searchParams.set("password", password || APP_PASSWORD);

  return `${url}?${searchParams.toString()}`;
}
