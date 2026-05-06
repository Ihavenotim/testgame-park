import { chromium } from "playwright";

const url = "file:///C:/Users/86181/Documents/Codex/2026-05-06/browser-use-imagegen-imagegen-ui-ui/index.html?qa=2";
const errors = [];

async function launchBrowser() {
  try {
    return await chromium.launch({ headless: true });
  } catch {
    return await chromium.launch({ channel: "msedge", headless: true });
  }
}

const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});

await page.goto(url, { waitUntil: "load" });
await page.waitForFunction(() => window.__isoPark && window.__isoPark.snapshot().guests >= 8);
await page.evaluate(() => {
  window.__isoPark.state.speed = 8;
  window.__isoPark.state.money = 1200;
  window.__isoPark.state.ticketPrice = 7;
});

const snapshots = [];
async function snap(label) {
  const data = await page.evaluate(() => window.__isoPark.snapshot());
  snapshots.push({ label, ...data });
}

await snap("initial");

await page.evaluate(() => {
  const api = window.__isoPark;
  for (let x = 7; x <= 13; x += 1) api.build(x, 10, "road");
  api.build(14, 9, "wheel");
  api.build(13, 11, "tree");
  api.build(12, 9, "garden");
  api.state.money += 300;
  api.state.cleaners = 1;
  api.state.mechanics = 1;
  api.state.marketing = 20;
});
await page.waitForTimeout(3500);
await snap("north expansion");

await page.evaluate(() => {
  const api = window.__isoPark;
  for (let y = 14; y <= 20; y += 1) api.build(6, y, "road");
  for (let x = 7; x <= 13; x += 1) api.build(x, 20, "road");
  api.build(14, 20, "coaster");
  api.build(12, 19, "snack");
  api.build(10, 21, "water");
  api.build(11, 21, "fountain");
});
await page.waitForTimeout(4500);
await snap("south expansion");

await page.evaluate(() => {
  const api = window.__isoPark;
  api.build(7, 10, "remove");
  api.build(7, 11, "road");
  api.build(7, 12, "road");
  api.build(7, 13, "road");
});
await page.waitForTimeout(3500);
await snap("rerouted path");

const saveRoundTrip = await page.evaluate(() => {
  const api = window.__isoPark;
  const before = api.snapshot();
  api.saveGame("0", true);
  api.state.money = 33;
  api.state.ticketPrice = 15;
  api.loadGame("0");
  const after = api.snapshot();
  api.deleteSave("0");
  return {
    before,
    after,
    ok: after.money === before.money &&
      after.ticketPrice === before.ticketPrice &&
      after.roads === before.roads &&
      after.attractions === before.attractions
  };
});

await page.mouse.wheel(0, -400);
await page.mouse.move(720, 450);
await page.mouse.down();
await page.mouse.move(900, 560, { steps: 8 });
await page.mouse.up();
await page.waitForTimeout(800);

const canvasHealth = await page.evaluate(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const { width, height } = canvas;
  const sample = ctx.getImageData(0, 0, width, height).data;
  let colored = 0;
  for (let i = 0; i < sample.length; i += 160) {
    const r = sample[i];
    const g = sample[i + 1];
    const b = sample[i + 2];
    if (!(r === 0 && g === 0 && b === 0) && !(r > 245 && g > 245 && b > 245)) colored += 1;
  }
  return { width, height, colored };
});

await page.screenshot({ path: "qa-playtest.png", fullPage: false });
await browser.close();

const final = snapshots.at(-1);
const result = {
  snapshots,
  saveRoundTrip,
  canvasHealth,
  errors,
  passed: errors.length === 0 &&
    canvasHealth.colored > 5000 &&
    saveRoundTrip.ok &&
    final.guests > snapshots[0].guests &&
    final.attractions >= 5 &&
    final.roads > snapshots[0].roads &&
    final.served > 0 &&
    final.happiness > 20 &&
    final.rating >= 1 &&
    final.cleaners >= 1 &&
    final.mechanics >= 1
};

console.log(JSON.stringify(result, null, 2));
if (!result.passed) process.exit(1);
