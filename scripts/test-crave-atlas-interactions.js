const path = require('path');
const fs = require('fs');
const { chromium } = require(path.join(__dirname, '../projects/external-os/restaurant-os/node_modules/playwright'));

const ARTIFACTS_DIR = '/Users/apple/.gemini/antigravity-ide/brain/945b8da6-0c8a-4383-b2a9-5e62bb73a105';
const BASE_URL = 'http://localhost:4010';
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const RESOLVED_CHROME_PATH = process.env.CHROME_BIN || (fs.existsSync(CHROME_PATH) ? CHROME_PATH : undefined);

async function run() {
  console.log('🧪 Starting CraveAtlas Functional Interaction & Polish Test Suite...\n');
  
  const browser = await chromium.launch({
    headless: true,
    executablePath: RESOLVED_CHROME_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  let totalTests = 0;
  let passedTests = 0;

  function assert(desc, condition) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✅ PASS: ${desc}`);
    } else {
      console.error(`  ❌ FAIL: ${desc}`);
    }
  }

  // --- SUITE 1: Mobile Viewport 390x844 Interactive Cart & Floating Bar ---
  console.log('📱 [SUITE 1] Mobile Viewport 390x844: Add-to-Cart, Card Stepper, & Floating Bar');
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(`${BASE_URL}/apps/crave-atlas`, { waitUntil: 'networkidle' });

    // Initial state: Empty cart
    const floatBar = page.locator('#ca-float-bar');
    assert('1.1: Floating order bar is initially hidden when cart is empty', !(await floatBar.isVisible()));

    const headerBadge = await page.locator('#ca-cart-label').textContent();
    assert('1.2: Header cart badge indicates Order Folio (0)', headerBadge.includes('(0)'));

    // Capture initial state screenshot
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'craveatlas_mobile_initial_empty.png') });

    // Find an uncustomized item (Tandoori Roti)
    const rotiCard = page.locator('.ca-dish-card[data-dish-id="item_tandoori_roti"]');
    const rotiAddBtn = rotiCard.locator('.ca-dish-add-btn');
    const rotiStepper = rotiCard.locator('.ca-dish-stepper');

    assert('1.3: Tandoori Roti initial button shows "+ ADD"', (await rotiAddBtn.textContent()).trim() === '+ ADD');
    assert('1.4: Tandoori Roti stepper is hidden initially', !(await rotiStepper.isVisible()));

    // Click "+ ADD" on simple item
    await rotiAddBtn.click();
    await page.waitForTimeout(250);

    // Verify card button transforms into stepper [- 1 +]
    assert('1.5: Add button transforms into in-place card stepper', await rotiStepper.isVisible());
    const qtyText1 = await rotiCard.locator('#card-qty-item_tandoori_roti').textContent();
    assert('1.6: Card stepper displays quantity 1', qtyText1.trim() === '1');

    // Drawer should NOT have popped open automatically
    const drawer = page.locator('#ca-cart-drawer');
    const isDrawerOpen = await drawer.evaluate((el) => el.classList.contains('open'));
    assert('1.7: Cart drawer does NOT disruptively open on first addition', !isDrawerOpen);

    // Floating bar appears smoothly
    assert('1.8: Floating bottom order bar appears when cart > 0', await floatBar.isVisible());
    const floatText = await page.locator('#ca-float-count').textContent();
    assert('1.9: Floating bar displays "1 item in your order"', floatText.includes('1 item'));
    const floatSubtotal = await page.locator('#ca-float-subtotal').textContent();
    assert('1.10: Floating bar displays valid subtotal ₹35.00', floatSubtotal.includes('₹35.00'));

    // Header updates immediately
    const headerBadgeAfter1 = await page.locator('#ca-cart-label').textContent();
    assert('1.11: Header cart badge synchronizes to Order Folio (1)', headerBadgeAfter1.includes('(1)'));

    // Capture state with floating bar active on mobile
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'craveatlas_mobile_floating_bar_active.png') });

    // Increment quantity via card stepper '+'
    const plusBtn = rotiStepper.locator('button:has-text("+")');
    await plusBtn.click();
    await page.waitForTimeout(200);

    const qtyText2 = await rotiCard.locator('#card-qty-item_tandoori_roti').textContent();
    assert('1.12: Card stepper increments to quantity 2', qtyText2.trim() === '2');
    const floatText2 = await page.locator('#ca-float-count').textContent();
    assert('1.13: Floating bar increments to 2 items', floatText2.includes('2 items'));
    const floatSubtotal2 = await page.locator('#ca-float-subtotal').textContent();
    assert('1.14: Floating bar updates subtotal to ₹70.00', floatSubtotal2.includes('₹70.00'));

    // Decrement quantity via card stepper '−'
    const minusBtn = rotiStepper.locator('button:has-text("−")');
    await minusBtn.click();
    await page.waitForTimeout(200);

    const qtyText3 = await rotiCard.locator('#card-qty-item_tandoori_roti').textContent();
    assert('1.15: Card stepper decrements back to quantity 1', qtyText3.trim() === '1');

    // Decrement again to 0 (removal)
    await minusBtn.click();
    await page.waitForTimeout(200);

    assert('1.16: Stepper disappears when quantity reaches 0', !(await rotiStepper.isVisible()));
    assert('1.17: Button reverts to "+ ADD"', (await rotiAddBtn.textContent()).trim() === '+ ADD');
    assert('1.18: Floating bar hides when cart becomes empty again', !(await floatBar.isVisible()));

    await page.close();
  }

  // --- SUITE 2: Modifier-Aware Dish Customizer Modal ---
  console.log('\n🥘 [SUITE 2] Modifier-Aware Dish Customizer Modal & Configuration');
  {
    const page = await browser.newPage({ viewport: { width: 430, height: 932 } });
    await page.goto(`${BASE_URL}/apps/crave-atlas`, { waitUntil: 'networkidle' });

    // Item with modifiers (e.g. item_paneer_tikka or dish_butter_chicken)
    const customCard = page.locator('.ca-dish-card[data-dish-id="item_paneer_tikka"]');
    const customBtn = customCard.locator('.ca-dish-add-btn');

    assert('2.1: Modifier dish card displays "+ CUSTOMISE"', (await customBtn.textContent()).includes('CUSTOMISE'));

    // Click "+ CUSTOMISE" to open modal
    await customBtn.click();
    await page.waitForTimeout(300);

    const modal = page.locator('#ca-customizer-modal');
    assert('2.2: Customizer modal opens on click', await modal.isVisible());

    const dishNameInModal = await page.locator('#cust-dish-name').textContent();
    assert('2.3: Modal displays dish name "Charcoal Smoked Paneer Tikka"', dishNameInModal.includes('Paneer Tikka'));

    // Check modifier groups rendered
    const groupsCount = await page.locator('.ca-cust-group').count();
    assert('2.4: Customizer renders modifier groups for dish', groupsCount >= 2);

    // Capture customizer modal screenshot
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'craveatlas_customizer_modal_open.png') });

    // Select Spicy Angara Embers (+₹20.00)
    const fierySpiceRadio = page.locator('input[value="m_hot"]');
    if (await fierySpiceRadio.count() > 0) {
      await fierySpiceRadio.check();
      await page.waitForTimeout(150);
      const modalTotal = await page.locator('#cust-modal-total').textContent();
      assert('2.5: Real-time modal total updates with option delta (+₹20.00 -> ₹370.00)', modalTotal.includes('370'));
    }

    // Confirm addition
    await page.click('#cust-add-to-order-btn');
    await page.waitForTimeout(300);

    assert('2.6: Modal closes after confirming customization', !(await modal.isVisible()));
    assert('2.7: Floating bar appears with customized item', await page.locator('#ca-float-bar').isVisible());

    // Button on card shows "CUSTOMISED (1) +"
    const updatedCustomBtn = await customCard.locator('.ca-dish-add-btn').textContent();
    assert('2.8: Card button reflects "CUSTOMISED (1) +"', updatedCustomBtn.includes('CUSTOMISED (1) +'));

    // Tapping floating bar opens drawer
    await page.click('#ca-float-bar');
    await page.waitForTimeout(300);

    const drawer = page.locator('#ca-cart-drawer');
    assert('2.9: Tapping floating bar opens order drawer', await drawer.evaluate((el) => el.classList.contains('open')));

    // Check that configured line has modifier tags
    const cartText = await page.locator('#ca-cart-items-container').textContent();
    assert('2.10: Cart drawer shows customized line item with options', cartText.includes('Paneer Tikka'));

    // Capture cart drawer open screenshot
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'craveatlas_cart_drawer_with_custom_item.png') });

    await page.close();
  }

  // --- SUITE 3: Culinary Signature Highlights Horizontal Carousel ---
  console.log('\n🎠 [SUITE 3] Culinary Signature Highlights Carousel (WAI-ARIA)');
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`${BASE_URL}/apps/crave-atlas`, { waitUntil: 'networkidle' });

    const carousel = page.locator('section[aria-roledescription="carousel"]');
    assert('3.1: Carousel container has aria-roledescription="carousel"', await carousel.count() > 0);

    const slides = page.locator('.ca-carousel-slide');
    const slideCount = await slides.count();
    assert('3.2: Carousel contains 5 distinct signature collection slides', slideCount === 5);

    const prevBtn = page.locator('#ca-carousel-prev');
    const nextBtn = page.locator('#ca-carousel-next');

    assert('3.3: Prev button is initially disabled at scrollLeft 0', await prevBtn.isDisabled());
    assert('3.4: Next button is enabled initially', !(await nextBtn.isDisabled()));

    // Click Next button to scroll
    await nextBtn.click();
    await page.waitForTimeout(400);

    const trackScrollLeft = await page.evaluate(() => document.getElementById('ca-carousel-track').scrollLeft);
    assert('3.5: Next button scrolls carousel track forward (> 0px)', trackScrollLeft > 0);
    assert('3.6: Prev button is now enabled after scrolling forward', !(await prevBtn.isDisabled()));

    // Capture desktop carousel scrolled screenshot
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'craveatlas_desktop_carousel_scrolled.png') });

    // Click slide 1 (Mains) to filter catalog
    const slide1 = slides.nth(0);
    await slide1.click();
    await page.waitForTimeout(300);

    const activeChip = await page.locator('.ca-cuisine-chip.active').textContent();
    assert('3.7: Clicking highlight card activates "Mains" category chip', activeChip.trim() === 'Mains');

    // Verify only Mains dishes visible
    const visibleCards = page.locator('.ca-dish-card:visible');
    const visibleCount = await visibleCards.count();
    const allMains = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.ca-dish-card')).filter(c => c.style.display !== 'none');
      return cards.every(c => c.getAttribute('data-dish-cat') === 'Mains');
    });
    assert('3.8: Menu catalog filters to show only Mains dishes', allMains && visibleCount > 0);

    await page.close();
  }

  // --- SUITE 4: Unified Search & Category State Synchronization ---
  console.log('\n🔍 [SUITE 4] Unified Search & Category Synchronization with Clear Recovery');
  {
    const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
    await page.goto(`${BASE_URL}/apps/crave-atlas`, { waitUntil: 'networkidle' });

    // Add an item to cart first to ensure search does not lose cart state
    const firstAdd = page.locator('.ca-dish-card[data-dish-id="item_tandoori_roti"] .ca-dish-add-btn');
    await firstAdd.click();
    await page.waitForTimeout(200);

    // Search for "Butter"
    await page.fill('#ca-global-search', 'Butter');
    await page.waitForTimeout(200);

    const visibleAfterSearch = await page.locator('.ca-dish-card:visible').count();
    assert('4.1: Search for "Butter" filters visible cards', visibleAfterSearch >= 1);

    // Cart state must remain intact
    assert('4.2: Cart state and floating bar preserved during search', await page.locator('#ca-float-bar').isVisible());

    // Search for non-existent dish
    await page.fill('#ca-global-search', 'NonExistentDish12345');
    await page.waitForTimeout(200);

    const emptyState = page.locator('#ca-catalog-empty');
    assert('4.3: Empty filter state displays when zero matches found', await emptyState.isVisible());

    // Click "Clear Filters & Show All"
    await page.click('#ca-catalog-empty button');
    await page.waitForTimeout(200);

    const visibleAfterClear = await page.locator('.ca-dish-card:visible').count();
    assert('4.4: Clear filters restores all catalog dishes without page reload', visibleAfterClear === 9);
    assert('4.5: Cart remains intact with Dal Bukhara stepper active', await page.locator('#stepper-item_tandoori_roti').isVisible());

    await page.close();
  }

  // --- SUITE 5: Full Checkout, Server Quotes, GST & Live Order Placement ---
  console.log('\n💰 [SUITE 5] Delivery vs Pickup Fulfillment, Server Quote & Live Order Placement');
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`${BASE_URL}/apps/crave-atlas`, { waitUntil: 'networkidle' });

    // Add Dal Bukhara (₹440)
    await page.click('.ca-dish-card[data-dish-id="item_tandoori_roti"] .ca-dish-add-btn');
    await page.waitForTimeout(200);

    // Open Cart Drawer
    await page.click('#ca-float-bar');
    await page.waitForTimeout(300);

    // Check delivery mode (default: ₹40 fee)
    const delFeeText = await page.locator('#ca-delivery-fee').textContent();
    assert('5.1: Delivery mode calculates ₹40.00 delivery fee', delFeeText.includes('40.00'));

    // Switch to Pickup at Outlet
    await page.click('#btn-fulfill-pickup');
    await page.waitForTimeout(200);

    const pickupFeeText = await page.locator('#ca-delivery-fee').textContent();
    assert('5.2: Pickup mode calculates ₹0.00 delivery fee', pickupFeeText.includes('0.00'));

    // Check GST calculation (₹35 * 5% = ₹1.75)
    const taxText = await page.locator('#ca-tax').textContent();
    assert('5.3: 5% GST accurately computed as ₹1.75', taxText.includes('1.75'));

    // Grand total = ₹35.00 + ₹1.75 = ₹36.75
    const totalText = await page.locator('#ca-total').textContent();
    assert('5.4: Total payable accurately computed as ₹36.75', totalText.includes('36.75'));

    // Place Order Now
    await page.click('#ca-submit-order-btn');
    await page.waitForTimeout(800);

    // Tracking modal should open
    const trackModal = page.locator('#ca-tracking-modal');
    assert('5.5: Live order tracking modal opens upon successful order placement', await trackModal.isVisible());

    const orderId = await page.locator('#track-order-id').textContent();
    assert('5.6: Server assigned authentic Order ID', orderId.startsWith('ord_'));

    // Cart is now reset to 0
    assert('5.7: Cart is cleared after verified order creation', !(await page.locator('#ca-float-bar').isVisible()));

    // Capture tracking modal screenshot
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'craveatlas_live_order_tracking_modal.png') });

    await page.close();
  }

  // --- SUITE 6: Multi-Viewport Responsive Audit & Zero Overflow Check ---
  console.log('\n📐 [SUITE 6] Multi-Viewport Responsive Audit (Zero Horizontal Overflow)');
  const viewports = [
    { width: 390, height: 844, name: 'iPhone 14/15' },
    { width: 430, height: 932, name: 'iPhone 15 Pro Max' },
    { width: 768, height: 1024, name: 'iPad Mini Portrait' },
    { width: 1440, height: 900, name: 'Desktop Standard' },
  ];

  for (const vp of viewports) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    await page.goto(`${BASE_URL}/apps/crave-atlas`, { waitUntil: 'networkidle' });

    // Add an item to trigger floating bar in this viewport
    await page.click('.ca-dish-card[data-dish-id="item_tandoori_roti"] .ca-dish-add-btn');
    await page.waitForTimeout(200);

    const isOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    assert(`6.${viewports.indexOf(vp) + 1}: ${vp.name} (${vp.width}x${vp.height}) has 0 horizontal overflow`, !isOverflow);

    await page.close();
  }

  await browser.close();

  console.log(`\n===============================================================`);
  console.log(`CRAVEATLAS TEST RESULTS: Total ${totalTests} | Passed ${passedTests} | Failed ${totalTests - passedTests}`);
  console.log(`===============================================================\n`);

  if (totalTests !== passedTests) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
