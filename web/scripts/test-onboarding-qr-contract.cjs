const fs = require("fs");
const path = require("path");

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function projectFile(relativePath) {
  return path.join(__dirname, "..", relativePath);
}

function readProjectFile(relativePath) {
  return fs.readFileSync(projectFile(relativePath), "utf8");
}

function assertOnboardingQrProxyRoute() {
  const route = readProjectFile("app/api/admin/auth/qr/onboarding/route.ts");
  assertCondition(
    route.includes('path: "/auth/qr/onboarding"'),
    "Web onboarding QR route must proxy to backend /auth/qr/onboarding.",
  );
  assertCondition(
    !route.includes("access_token") && !route.includes("refresh_token"),
    "Web onboarding QR route must not handle raw session tokens.",
  );
}

function assertUsersApiHelper() {
  const api = readProjectFile("src/features/users/api.ts");
  assertCondition(
    api.includes("generateOnboardingLoginQr"),
    "Users API must expose generateOnboardingLoginQr().",
  );
  assertCondition(
    api.includes('"/api/admin/auth/qr/onboarding"'),
    "Users API must call the onboarding QR web route.",
  );
}

function assertUsersUiContract() {
  const table = readProjectFile(
    "src/features/users/components/users-admin-table.tsx",
  );
  assertCondition(
    table.includes("QR для нового пользователя"),
    "Users table must expose the onboarding QR action in Russian UI.",
  );
  assertCondition(
    table.includes("generateOnboardingLoginQr"),
    "Users table must call generateOnboardingLoginQr().",
  );
  assertCondition(
    table.includes("toDataURL"),
    "Users table must render the returned onboarding deep link as a QR image.",
  );
  assertCondition(
    table.includes("formatDateTime(onboardingQr.expires_at, language)"),
    "Users table must format onboarding QR expiry instead of showing raw ISO timestamps.",
  );
}

assertOnboardingQrProxyRoute();
assertUsersApiHelper();
assertUsersUiContract();
console.log("Onboarding QR contract assertions passed");
