async (page) => {
  const viewports = [{ name: "desktop", width: 1600, height: 1000 }, { name: "mobile", width: 390, height: 844 }];
  const routes = [
    ["dashboard", "/lecturer/dashboard"], ["questions", "/lecturer/questions"],
    ["studio", "/lecturer/questions/new"], ["materials", "/lecturer/materials"],
    ["upload", "/lecturer/materials/new"], ["exams", "/lecturer/exams"],
    ["attendance", "/lecturer/exams/swe201-final/attendance"],
  ];
  const writes = [];
  const responses = [];
  const errors = [];
  page.on("request", request => { if (request.url().includes("/api/v1/") && !["GET", "OPTIONS"].includes(request.method())) writes.push({ method: request.method(), path: new URL(request.url()).pathname }); });
  page.on("response", response => { if (response.url().includes("/api/v1/")) responses.push({ path: new URL(response.url()).pathname, status: response.status() }); });
  page.on("pageerror", error => errors.push(error.message));
  const report = [];
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    for (const [name, path] of routes) {
      if (process.env.VERIFY_ROUTE_NAMES && !process.env.VERIFY_ROUTE_NAMES.split(",").includes(name)) continue;
      await page.goto(`http://localhost:5173${path}`);
      await page.locator("h1").waitFor();
      await page.getByText("Loading data…", { exact: true }).first().waitFor({ state: "hidden", timeout: 45000 });
      await page.evaluate(() => document.fonts.ready);
      await page.addScriptTag({ path: "node_modules/axe-core/axe.min.js" });
      const audit = await page.evaluate(async () => {
        const result = await window.axe.run(document, { rules: { "region": { enabled: true } } });
        return { overflow: document.documentElement.scrollWidth > innerWidth, violations: result.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => n.target) })), title: document.title };
      });
      await page.screenshot({ path: `.impeccable/review/${name}-${viewport.name}.png`, fullPage: name !== "studio" });
      if (name === "studio") {
        const scroller = page.locator(viewport.name === "desktop" ? ".studio-editor" : ".studio-body");
        for (const [state, target] of [["answers", "Answer options"], ["rationale", "Pedagogical explanation"], ...(viewport.name === "mobile" ? [["preview", "Live student review"]] : [])]) {
          const destination = target === "Live student review" ? page.getByRole("region", { name: target, exact: true }) : page.getByText(target, { exact: true }).first();
          await destination.scrollIntoViewIfNeeded();
          await page.screenshot({ path: `.impeccable/review/studio-${viewport.name}-${state}.png`, fullPage: false });
        }
        await scroller.evaluate(element => { element.scrollTop = 0; });
      }
      report.push({ page: name, viewport: viewport.name, ...audit });
      console.log(JSON.stringify(report[report.length - 1]));
    }
  }
  console.log(JSON.stringify({ writes, errors, responses: [...new Set(responses.map(r => `${r.path}: ${r.status}`))] }));
  return { report, writes, responses, errors };
}
