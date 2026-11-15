import { expect, test, type Page } from '@playwright/test';

/** Opens the demo toolbar, advances the simulation one step, and closes it again. */
async function simulateNextStep(page: Page) {
  await page.getByRole('button', { name: 'Demo', exact: true }).click();
  await page.getByRole('button', { name: 'Simulate next step' }).click();
  await page.getByRole('button', { name: 'Demo', exact: true }).click();
}

test('new customer subscribes, follows the wash live, sees photos and rates it', async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on('console', (msg) => msg.type() === 'error' && consoleErrors.push(msg.text()));
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  // --- Launcher → interview mode
  await page.goto('/');
  await page.getByRole('button', { name: 'Start as a new customer' }).click();
  await expect(
    page.getByRole('heading', { name: /washed every week in your own parking spot/ }),
  ).toBeVisible();
  await expect(page.getByText('This demo records only which screens you used')).toBeVisible();
  await page.getByRole('button', { name: 'Get started' }).click();

  // --- Step 2: phone + demo code (auto-advances)
  await expect(page.getByText('Step 2 of 7')).toBeVisible();
  await page.getByRole('button', { name: 'Send code' }).click();
  await expect(page.getByText('Demo code: 1234')).toBeVisible();
  await page.getByLabel('Digit 1').pressSequentially('1234');

  // --- Step 3: compound + home
  await expect(page.getByText('Step 3 of 7')).toBeVisible();
  await expect(page.getByRole('button', { name: /Willow Bay/ })).toContainText('Coming soon');
  await page.getByRole('button', { name: /Palm Grove Residence/ }).click();
  await expect(page.getByText('Wash days: Tuesday & Saturday')).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('First name').fill('Salma');
  await page.getByLabel('Building or villa number').fill('7');
  await page.getByLabel('Apartment (optional)').fill('12');
  await page.getByRole('button', { name: 'Continue' }).click();

  // --- Step 4: car + parking
  await page.getByLabel('Make').selectOption('Kia');
  await page.getByLabel('Model').selectOption('Sportage');
  await page.getByRole('radio', { name: 'Red' }).check({ force: true });
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('Parking zone').selectOption('Basement B2');
  await page.getByLabel('Parking spot number').fill('31');
  await page.getByRole('button', { name: 'Continue' }).click();

  // --- Step 5: plan (nothing pre-selected)
  await expect(page.getByRole('button', { name: 'Choose a plan to continue' })).toBeDisabled();
  await expect(page.getByText('Most popular')).toBeVisible();
  await page.getByRole('radio', { name: /Plus/ }).check({ force: true });
  await page.getByRole('button', { name: 'Continue' }).click();

  // --- Step 6: capacity-aware day
  await expect(page.getByText('6 spots left')).toBeVisible();
  await expect(page.getByText('Only 2 spots left')).toBeVisible();
  await page.getByRole('radio', { name: /Tuesday/ }).check({ force: true });
  await page.getByRole('button', { name: 'Continue' }).click();

  // --- Step 7: review and pay (demo card is read-only)
  await expect(page.getByText('Demo — no payment is processed')).toBeVisible();
  await expect(page.getByLabel('Card number')).toHaveJSProperty('readOnly', true);
  await expect(page.getByText('Damage protection')).toBeVisible();
  await page.getByRole('button', { name: 'Subscribe — EGP 950/month' }).click();

  // --- Success
  await expect(page.getByRole('heading', { name: 'You’re all set, Salma!' })).toBeVisible();
  await expect(page.getByText('Your first wash')).toBeVisible();
  await page.getByRole('button', { name: 'Go to home' }).click();

  // --- Home shows the next wash
  await expect(page.getByRole('heading', { name: 'Hello, Salma' })).toBeVisible();
  await expect(page.getByText('Next wash')).toBeVisible();
  await expect(page.getByText('Kia Sportage · Spot 31')).toBeVisible();

  // --- Advance the wash from the demo toolbar: on site → washing → done
  await simulateNextStep(page);
  await expect(page.getByText('Washer on site')).toBeVisible();
  await expect(page.getByText(/arrived at Palm Grove Residence/).first()).toBeVisible();
  await simulateNextStep(page);
  await expect(page.getByText('Washing your car now')).toBeVisible();
  await simulateNextStep(page);
  await expect(page.getByText('WhatsApp · now').first()).toBeVisible();

  // --- Completed wash with photos
  await page.getByRole('link', { name: 'See before and after photos' }).click();
  await expect(page.getByRole('slider', { name: 'Before and after comparison' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Kia Sportage before the wash' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Kia Sportage after the wash' })).toBeVisible();
  await page.getByRole('tab', { name: 'Checklist' }).click();
  await expect(page.getByText('Wheels and rims')).toBeVisible();

  // --- Rate it
  await page.getByRole('radio', { name: '5 stars' }).click();
  await page.getByRole('button', { name: 'Spotless' }).click();
  await page.getByRole('button', { name: 'Submit rating' }).click();
  await expect(page.getByRole('heading', { name: 'Your rating' })).toBeVisible();
  await expect(page.getByText('Spotless')).toBeVisible();

  // --- State survives a reload
  await page.waitForTimeout(500); // debounced localStorage write
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Your rating' })).toBeVisible();

  // --- The new subscription is visible to operations
  await page.goto('/#/admin/customers');
  await page.getByRole('searchbox').fill('Salma');
  await expect(page.getByRole('cell', { name: 'Building 7, Apt 12' })).toBeVisible();

  expect(consoleErrors).toEqual([]);
});
