const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1512, height: 982 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const button = name => page.getByRole('button', { name, exact: true }).filter({ visible: true });
    await page.goto('http://localhost:8083', { waitUntil: 'domcontentloaded' });
    await page.getByTestId('launch-screen').waitFor({ state: 'detached' });
    await button('Explore workspace').click();
    await button('People & Access').click();
    await page.getByRole('tab', { name: 'Users', exact: true }).click();
    assert.equal(await button('Surveillance Users').count(), 0);
    await page.getByText(/^UID: /).filter({ visible: true }).first().waitFor();
    for (const group of ['Learners', 'Surveillance users']) {
      if (group === 'Surveillance users') {
        await button('User directory: Learners').click();
        await button(group).click();
      }
      await button('Add').click();
      await button('Choose image').waitFor();
      await page.keyboard.press('Escape');
      await button('Bulk upload').click();
      await button('Download template').waitFor();
      await page.keyboard.press('Escape');
    }
    const portrait = page.getByRole('img', { name: /profile image$/ }).filter({ visible: true }).first();
    await portrait.waitFor();
    await portrait.click();
    await button('Back to records').waitFor();
    await page.getByRole('img', { name: /profile image$/ }).filter({ visible: true }).first().waitFor();
    await button('Back to records').click();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(600);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []);
    console.log('People & Access: learner/surveillance add, image controls, CSV upload, and mobile layout passed.');
  } finally { await browser.close(); }
})();

