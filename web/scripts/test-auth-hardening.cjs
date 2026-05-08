const fs = require("fs");
const path = require("path");

const BASE_URL = process.env.WEB_BASE_URL || "http://127.0.0.1:3000";
const ADMIN_LOGIN = process.env.WEB_ADMIN_LOGIN || "admin";
const ADMIN_PASSWORD = process.env.WEB_ADMIN_PASSWORD || "admin12345";

const RESTRICTED_FILES = [
  "app/dashboard/page.tsx",
  "app/catalog/page.tsx",
  "app/simulation-v2/page.tsx",
  "src/shared/server/backend-admin-proxy.ts",
];

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function projectFile(relativePath) {
  return path.join(__dirname, "..", relativePath);
}

function assertNoServiceTokenFallback() {
  for (const relativePath of RESTRICTED_FILES) {
    const content = fs.readFileSync(projectFile(relativePath), "utf8");
    assertCondition(
      !content.includes("WEB_ADMIN_ACCESS_TOKEN"),
      `Forbidden service-token fallback found in ${relativePath}`,
    );
  }
}

function assertRefreshFailureDoesNotClearCookies() {
  const content = fs.readFileSync(
    projectFile("app/api/admin/auth/refresh/route.ts"),
    "utf8",
  );
  assertCondition(
    !content.includes("clearAuthCookies"),
    "Refresh failures must not clear auth cookies; a stale failed refresh can race with a successful token rotation.",
  );
}

function collectSetCookieValues(headers) {
  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie();
  }
  const combined = headers.get("set-cookie");
  if (!combined) {
    return [];
  }
  return combined.split(",").map((value) => value.trim());
}

function extractCookiePair(setCookieValue) {
  const firstChunk = setCookieValue.split(";")[0] || "";
  return firstChunk.trim();
}

async function assertLoginSanitizedAndCookieAuth() {
  const loginResponse = await fetch(`${BASE_URL}/api/admin/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      login: ADMIN_LOGIN,
      password: ADMIN_PASSWORD,
    }),
  });

  assertCondition(
    loginResponse.ok,
    `Login failed with status ${loginResponse.status}`,
  );

  const loginBody = await loginResponse.json();
  assertCondition(
    !("access_token" in loginBody) && !("refresh_token" in loginBody),
    "Login response body must not include raw tokens",
  );

  const setCookies = collectSetCookieValues(loginResponse.headers);
  assertCondition(setCookies.length > 0, "Login did not set auth cookies");
  const cookieHeader = setCookies.map(extractCookiePair).join("; ");

  const refreshResponse = await fetch(`${BASE_URL}/api/admin/auth/refresh`, {
    method: "POST",
    headers: {
      cookie: cookieHeader,
    },
  });

  assertCondition(
    refreshResponse.ok,
    `Refresh failed with status ${refreshResponse.status}`,
  );

  const refreshBody = await refreshResponse.json();
  assertCondition(
    !("access_token" in refreshBody) && !("refresh_token" in refreshBody),
    "Refresh response body must not include raw tokens",
  );
}

async function run() {
  assertNoServiceTokenFallback();
  assertRefreshFailureDoesNotClearCookies();
  await assertLoginSanitizedAndCookieAuth();
  console.log("Auth hardening assertions passed");
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
