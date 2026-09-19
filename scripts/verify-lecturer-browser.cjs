/* CLI fallback for a bounded seven-page browser audit; requires a Playwright runtime path. */
const fs = require("node:fs");
const { chromium } = require(process.argv[2]);
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const page = await browser.newPage();
    await page.goto("http://localhost:5173/login");
    await page.getByRole("textbox", { name: "Email or username" }).fill(process.env.LEARNABLE_TEST_USERNAME);
    await page.getByRole("textbox", { name: "Password", exact: true }).fill(process.env.LEARNABLE_TEST_PASSWORD);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.waitForURL("**/lecturer/dashboard", { timeout: 60000 });
    console.log("Actual Lecturer browser login: passed");
    const verify = eval(`(${fs.readFileSync("scripts/verify-lecturer.cjs", "utf8")})`);
    const report = await verify(page);
    fs.writeFileSync(process.env.VERIFY_ROUTE_NAMES ? ".impeccable/review/studio-rebuild-audit.json" : ".impeccable/review/browser-audit.json", JSON.stringify(report, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
