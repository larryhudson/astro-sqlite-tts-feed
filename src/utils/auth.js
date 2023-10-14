import crypto from "crypto";
import Redis from "ioredis";

const redisClient = new Redis();

if (typeof import.meta.env.APP_PASSWORD === "undefined") {
  throw new Error(
    "APP_PASSWORD environment variable is not defined. Please define it.",
  );
}

export function getSessionKeyFromAstro(Astro) {
  const passwordCookie = Astro.cookies.get("astro-sqlite-tts-feed-session");
  if (!passwordCookie) return false;

  const password = passwordCookie.value;

  return password;
}

export function getCurrentUserIdFromAstro(Astro) {
  // TODO: implement real sessions
  const sessionKey = getSessionKeyFromAstro(Astro);
  const userId = getUserIdFromSessionKey(sessionKey);

  return userId;
}

function hashPassword(password) {
  const HASHING_SECRET = import.meta.env.APP_HASHING_SECRET;

  if (!HASHING_SECRET) {
    throw new Error(
      "APP_HASHING_SECRET environment variable not set. Please set it in .env",
    );
  }

  const passwordHash = crypto
    .createHmac("sha256", HASHING_SECRET)
    .update(password)
    .digest("hex");

  return passwordHash;
}

/*
 the password flow:
 when someone signs up, they enter their password twice. we check that the passwords match.
 then we hash their password using our secret key. we save the hashed password in the db.

 when someone logs in, we check the password hash against the password hash stored in the db for the user's email
if it matches, we create a new session key and store it in redis, with the user id as the value. we set it to expire after 24 hours.
we set a cookie header with that session key so the browser will continue to use that cookie

on each request, we read the session key from the user's cookie
we look it up in redis and get the user id
if we don't get a user id, we redirect to login page
*/

function generateSessionKey() {
  return crypto.randomBytes(16).toString("hex");
}

export function createSession(userId) {
  const sessionKey = generateSessionKey();
  redisClient.set(sessionKey, userId, "EX", SEVEN_DAYS); // Set the session to expire in 24 hours
  return sessionKey;
}

export function deleteSession(Astro) {
  const sessionKey = getSessionKeyFromAstro(Astro);
  redisClient.del(sessionKey);
}

export function getUserIdFromSessionKey(sessionKey) {
  return redisClient.get(sessionKey);
}

export function checkPassword(suppliedPassword, passwordHash) {
  const suppliedHash = hashPassword(suppliedPassword);
  return suppliedHash === passwordHash;
}

const ONE_DAY_SECONDS = 60 * 60 * 24;
const SEVEN_DAYS = 7 * ONE_DAY_SECONDS;

export function setSessionCookie(Astro, sessionKey) {
  Astro.cookies.set("astro-sqlite-tts-feed-session", sessionKey, {
    maxAge: SEVEN_DAYS,
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
