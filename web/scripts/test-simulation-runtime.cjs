const puppeteer = require("puppeteer");

const BASE_URL = process.env.WEB_BASE_URL || "http://127.0.0.1:3000";
const ADMIN_LOGIN = process.env.WEB_ADMIN_LOGIN || "admin";
const ADMIN_PASSWORD = process.env.WEB_ADMIN_PASSWORD || "admin12345";
const HEADLESS = process.env.HEADLESS === "false" ? false : true;

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function login(page) {
  await page.goto(`${BASE_URL}/auth?lang=ru`, {
    waitUntil: "networkidle0",
    timeout: 30000,
  });

  await page.type('input[placeholder="admin"]', ADMIN_LOGIN);
  await page.type('input[placeholder="********"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForFunction(
    () => window.location.pathname.includes("/dashboard"),
    { timeout: 15000 },
  );
}

async function assertDashboardKeyboardFlow(page) {
  await page.goto(`${BASE_URL}/dashboard?lang=ru`, {
    waitUntil: "networkidle0",
    timeout: 30000,
  });

  const focused = [];
  for (let i = 0; i < 6; i += 1) {
    await page.keyboard.press("Tab");
    const current = await page.evaluate(() => {
      const el = document.activeElement;
      return {
        tag: el?.tagName || null,
        text: (el?.textContent || "").trim().replace(/\s+/g, " "),
        href: el?.getAttribute("href") || null,
      };
    });
    focused.push(current);
  }

  const firstFour = focused.slice(0, 4).map((item) => item.text);
  assertCondition(
    firstFour[0]?.includes("RU") &&
      firstFour[1]?.includes("EN") &&
      firstFour[2]?.includes("Перейти") &&
      firstFour[3]?.includes("Перейти"),
    `Unexpected dashboard tab sequence: ${JSON.stringify(focused)}`,
  );

  const hasPortalFocus = focused.some((item) => item.tag === "NEXTJS-PORTAL");
  assertCondition(
    !hasPortalFocus,
    `Portal received focus: ${JSON.stringify(focused)}`,
  );
}

async function assertSimulationMobileGuard(page) {
  await page.goto(`${BASE_URL}/simulation-v2?lang=ru`, {
    waitUntil: "networkidle0",
    timeout: 30000,
  });

  await page.setViewport({ width: 320, height: 900 });
  await page.waitForSelector("[class*='SimulationEditor_viewportGuard']", {
    timeout: 15000,
  });

  const metrics = await page.evaluate(() => {
    const guard = document.querySelector(
      "[class*='SimulationEditor_viewportGuard']",
    );
    const main = document.querySelector("[class*='SimulationEditor_main']");
    if (!guard || !main) {
      return null;
    }
    const guardRect = guard.getBoundingClientRect();
    return {
      guardText: guard.textContent || "",
      guardDisplay: window.getComputedStyle(guard).display,
      mainDisplay: window.getComputedStyle(main).display,
      guardTop: guardRect.top,
    };
  });

  assertCondition(Boolean(metrics), "Missing simulation mobile viewport guard");
  assertCondition(
    metrics.guardText.includes("1024 px") && metrics.guardDisplay !== "none",
    `Mobile guard is not visible or explanatory: ${JSON.stringify(metrics)}`,
  );
  assertCondition(
    metrics.mainDisplay === "none",
    `Builder must be hidden below 1024px: ${JSON.stringify(metrics)}`,
  );
}

async function run() {
  const browser = await puppeteer.launch({
    headless: HEADLESS,
    defaultViewport: { width: 1280, height: 900 },
  });

  try {
    const page = await browser.newPage();
    await login(page);
    await assertDashboardKeyboardFlow(page);
    await assertSimulationMobileGuard(page);
    console.log("Simulation runtime assertions passed");
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
