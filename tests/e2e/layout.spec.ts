import { expect, test } from '@playwright/test';

// These assert geometry rather than text. The original suite passed while the
// problem panel was 42px wide and the output panel sat beside the editor
// instead of below it, because it only checked that strings were present.

test('problem panel gets a usable share of the viewport', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '짝수만 더하기' }).first()).toBeVisible();

  const viewport = page.viewportSize();
  if (!viewport) throw new Error('no viewport');

  const panel = page.locator('[data-panel]').first();
  const box = await panel.boundingBox();
  if (!box) throw new Error('problem panel has no box');

  // defaultSize is meant to be 42% of the group, never a few dozen pixels.
  expect(box.width).toBeGreaterThan(viewport.width * 0.2);
});

test('output panel sits below the editor, not beside it', async ({ page }) => {
  await page.goto('/');

  const editor = page.locator('.cm-editor').first();
  const outputTab = page.getByRole('button', { name: '결과' });

  const editorBox = await editor.boundingBox();
  const outputBox = await outputTab.boundingBox();
  if (!editorBox || !outputBox) throw new Error('missing layout boxes');

  // Vertical orientation on the right-hand group: the output tabs start below
  // the editor's top edge and overlap it horizontally.
  expect(outputBox.y).toBeGreaterThan(editorBox.y);
  expect(outputBox.x).toBeLessThan(editorBox.x + editorBox.width);
});

test('the page itself does not scroll', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '짝수만 더하기' }).first()).toBeVisible();

  const overflow = await page.evaluate(() => {
    const el = document.documentElement;
    return { scroll: el.scrollHeight, client: el.clientHeight };
  });

  // The workspace fills the viewport; only inner panels scroll.
  expect(overflow.scroll).toBeLessThanOrEqual(overflow.client + 1);
});

test('action bar is reachable without scrolling', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: '테스트 실행' })).toBeInViewport();
  await expect(page.getByRole('button', { name: '제출' })).toBeInViewport();
});
