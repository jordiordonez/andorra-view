// Dev helper: headless screenshot + console capture of the running app.
// Usage: node scripts/screenshot.mjs <url> <out.png> [width] [height] [waitMs] [evalJs]
import { chromium } from 'playwright-core'

const [url = 'http://localhost:5173/', out = 'shot.png', w = '1440', h = '900', wait = '12000', evalJs] = process.argv.slice(2)
const browser = await chromium.launch({
  channel: 'chrome',
  headless: process.env.HEADLESS === '1',
  args: process.env.HEADLESS === '1' ? ['--enable-unsafe-swiftshader'] : [],
})
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: +w < 600 ? 3 : 1, isMobile: +w < 600, hasTouch: +w < 600 })
const logs = []
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`))
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))
page.on('requestfailed', (r) => logs.push(`[requestfailed] ${r.url().slice(0, 140)} ${r.failure()?.errorText}`))
await page.goto(url, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(+wait)
if (evalJs) {
  const r = await page.evaluate(evalJs)
  console.log('EVAL:', JSON.stringify(r)?.slice(0, 3000))
  await page.waitForTimeout(4000)
}
await page.screenshot({ path: out })
console.log(logs.filter((l) => !l.includes('[debug]')).slice(0, 60).join('\n'))
await browser.close()
