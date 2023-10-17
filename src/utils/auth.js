import crypto from "crypto";
import Redis from "ioredis";
import { findRecord } from "@src/utils/db";

const redisClient = new Redis();

export function getSessionKeyFromAstro(Astro) {
  const passwordCookie = Astro.cookies.get("astro-sqlite-tts-feed-session");
  if (!passwordCookie) return false;

  const password = passwordCookie.value;

  return password;
}

export function getCurrentUserIdFromAstro(Astro) {
  const sessionKey = getSessionKeyFromAstro(Astro);
  const userId = getUserIdFromSessionKey(sessionKey);

  return userId;
}

export function hashPassword(password, secret) {
  const HASHING_SECRET = secret || import.meta.env.APP_HASHING_SECRET;
  console.log("password", password);
  console.log("HASHING_SECRET", HASHING_SECRET);

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

export async function handleLogin(Astro, email, password) {
  const existingUser = findRecord({
    table: "users",
    condition: { email },
  });

  if (!existingUser) {
    throw new Error("User with that email does not exist");
  }

  const isCorrectPassword = checkPassword(password, existingUser.password);

  if (!isCorrectPassword) {
    throw new Error("Incorrect password");
  }

  const sessionKey = createSession(existingUser.id);
  setSessionCookie(Astro, sessionKey);
  return true;
}

export async function handleLogout(Astro) {
  await deleteSession(Astro);
}

function generateSessionKey() {
  return crypto.randomBytes(16).toString("hex");
}

export async function createSession(userId) {
  const sessionKey = generateSessionKey();
  await redisClient.set(sessionKey, userId, "EX", SEVEN_DAYS); // Set the session to expire in 24 hours
  return sessionKey;
}

export async function deleteSession(Astro) {
  const sessionKey = getSessionKeyFromAstro(Astro);
  await redisClient.del(sessionKey);
  deleteSessionCookie(Astro);
}

export async function getUserIdFromSessionKey(sessionKey) {
  return await redisClient.get(sessionKey);
}

export function checkPassword(suppliedPassword, passwordHash) {
  const suppliedHash = hashPassword(suppliedPassword);
  console.log("suppliedHash", suppliedHash);
  console.log("passwordHash", passwordHash);
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

export function deleteSessionCookie(Astro) {
  Astro.cookies.delete("astro-sqlite-tts-feed-session", {
    path: "/",
  });
}

export function addPasswordParamToUrl(url, password) {
  const searchParams = new URLSearchParams();
  searchParams.set("password", password || APP_PASSWORD);

  return `${url}?${searchParams.toString()}`;
}
