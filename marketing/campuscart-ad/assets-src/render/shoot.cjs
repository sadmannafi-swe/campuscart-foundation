const { chromium } = require('playwright');
const items = process.argv.slice(3);
const OUT = process.argv[2];
(async () => {
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] });
  for (const spec of items) {
    const [item, w = 1200, h = 900] = spec.split(':');
    const p = await b.newPage({ viewport: { width: +w, height: +h } });
    const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    await p.goto(`http://127.0.0.1:8765/studio.html?item=${item}&w=${w}&h=${h}`);
    await p.waitForFunction(() => window.__done === true, null, { timeout: 120000 }).catch(() => errs.push('timeout'));
    await p.locator('canvas').screenshot({ path: `${OUT}/${item}.png` });
    console.log(item, errs.length ? errs.slice(0, 2) : 'ok');
    await p.close();
  }
  await b.close();
})();
