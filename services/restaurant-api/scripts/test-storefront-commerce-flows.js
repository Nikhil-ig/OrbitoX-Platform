/**
 * 🪐 RestaurantOS 4.2 — Comprehensive Commerce Flow & Anti-Clone Differentiation Test
 */

const { chromium } = require('playwright');
const fs = require('fs');

const BASE_URL = 'http://localhost:4010';
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const LOCATOR = '7Kp9xQ8m2L';

const TEMPLATES = [
  { id: 'tmpl_haute_gastronomy', name: 'Haute Gastronomy' },
  { id: 'tmpl_nordic_minimal', name: 'Nordic Minimal' },
  { id: 'tmpl_artisan_coffee', name: 'Artisan Coffee & Vitrine' },
  { id: 'tmpl_neon_street', name: 'Neon Street Food' },
  { id: 'tmpl_trattoria_bella', name: 'Trattoria Convivial' },
  { id: 'tmpl_tokyo_izakaya', name: 'Tokyo Izakaya & Ramen' },
];

async function run() {
  console.log('🧪 Starting RestaurantOS 4.2 Commerce & Anti-Clone Validation Suite...\n');
  const browser = await chromium.launch({
    executablePath: fs.existsSync(CHROME_PATH) ? CHROME_PATH : undefined,
    headless: true
  });

  const domSignatures = {};
  let totalAssertions = 0;
  let passedAssertions = 0;

  function assert(condition, message) {
    totalAssertions++;
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passedAssertions++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
    }
  }

  // 1. Test each template DOM structure and unique signature elements
  for (const tmpl of TEMPLATES) {
    console.log(`\n🔍 Validating Template: [${tmpl.id}] (${tmpl.name})`);
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(`${BASE_URL}/dine/${LOCATOR}?templateId=${tmpl.id}&preview=1`, { waitUntil: 'networkidle' });

    const html = await page.content();
    const storefrontRoot = await page.locator('#storefront-app-root').innerHTML();
    domSignatures[tmpl.id] = storefrontRoot;

    // Check zero emojis in rendered DOM
    const emojiRegex = /[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    const hasEmojis = emojiRegex.test(html);
    assert(!hasEmojis, `Zero emojis rendered in DOM for ${tmpl.name}`);

    // Check specific architectural signatures
    if (tmpl.id === 'tmpl_haute_gastronomy') {
      assert(html.includes('movement-card') || html.includes('Act 01'), 'Haute Gastronomy contains movement tasting progression');
      assert(html.includes('sommelier') || html.includes('Pairing:'), 'Haute Gastronomy contains sommelier pairing recommendations');
    } else if (tmpl.id === 'tmpl_nordic_minimal') {
      assert(html.includes('ARCTIC HARVEST CIRCLE') || html.includes('Harvest Circle'), 'Nordic contains Arctic harvest circle metadata');
      assert(html.includes('LOT-081') || html.includes('Chapter I'), 'Nordic contains lot provenance and chapter structure');
    } else if (tmpl.id === 'tmpl_artisan_coffee') {
      assert(html.includes('MICRO-LOT ROASTERY') || html.includes('Vitrine'), 'Cafe contains micro-lot roastery bar metadata');
      assert(html.includes('Jasmine Florals') || html.includes('Wild Bergamot'), 'Cafe contains roast aroma spectrum dials');
    } else if (tmpl.id === 'tmpl_neon_street') {
      assert(html.includes('NEON YOKOCHO') || html.includes('Stall 01'), 'Neon Street contains night alley stall nomenclature');
      assert(html.includes('STREET HEAT') || html.includes('RAPID CHECKOUT'), 'Neon Street contains high-energy street checkout');
    } else if (tmpl.id === 'tmpl_trattoria_bella') {
      assert(html.includes('Osteria Rustica') || html.includes('Tavola Grande'), 'Trattoria contains Tavola Grande sharing feast');
      assert(html.includes('DOP CERTIFIED') || html.includes('Il Conto del Tavolo'), 'Trattoria contains Italian course structure & bill presenter');
    } else if (tmpl.id === 'tmpl_tokyo_izakaya') {
      assert(html.includes('Craft Your Custom Ramen Bowl') || html.includes('職人魂'), 'Izakaya contains artisan calligraphy and ramen order slip');
      assert(html.includes('Kotteri') || html.includes('Katame'), 'Izakaya contains ramen broth and noodle firmness selectors');
    }

    await page.close();
  }

  // 2. Anti-Clone Differentiation Check: Pairwise Jaccard Dissimilarity of Storefront Markup
  console.log('\n📊 Pairwise Structural Differentiation Analysis (Storefront App Root):');
  const templateIds = Object.keys(domSignatures);
  for (let i = 0; i < templateIds.length; i++) {
    for (let j = i + 1; j < templateIds.length; j++) {
      const idA = templateIds[i];
      const idB = templateIds[j];
      const wordsA = new Set(domSignatures[idA].match(/\b[a-zA-Z_-]{4,}\b/g) || []);
      const wordsB = new Set(domSignatures[idB].match(/\b[a-zA-Z_-]{4,}\b/g) || []);

      const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
      const union = new Set([...wordsA, ...wordsB]);
      const similarity = intersection.size / union.size;
      const divergence = (1 - similarity) * 100;

      assert(divergence > 40, `Structural divergence between ${idA} and ${idB}: ${divergence.toFixed(1)}% (Threshold > 40%)`);
    }
  }

  // 3. Functional Commerce Verification: Order Flow & Live Dispatch
  console.log('\n🛒 Testing Commerce Functional Flow on Izakaya & Custom Ramen Slip...');
  const orderPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await orderPage.goto(`${BASE_URL}/dine/${LOCATOR}?templateId=tmpl_tokyo_izakaya&preview=1`, { waitUntil: 'networkidle' });

  // Test selecting ramen options
  await orderPage.evaluate(() => {
    if (typeof window.setRamenSlipOption === 'function') {
      window.setRamenSlipOption('broth', 'Kotteri (Ultra-Rich)');
      window.setRamenSlipOption('noodles', 'Barikata (Extra-Firm)');
      window.setRamenSlipOption('garlic', 'Heavy (2 Cloves)');
      window.setRamenSlipOption('tare', 'Double (2x)');
    }
  });

  // Test adding custom ramen slip to cart
  const cartBefore = await orderPage.evaluate(() => (window.cart || []).length);
  await orderPage.evaluate(() => {
    if (typeof window.submitRamenSlipItem === 'function') {
      window.submitRamenSlipItem('item_paneer_tikka');
    }
  });
  const cartAfter = await orderPage.evaluate(() => (window.cart || []).length);
  assert(cartAfter > cartBefore, `Custom Ramen Slip successfully added to cart (count: ${cartAfter})`);

  // Verify cart item content has modifier notes
  const cartContent = await orderPage.evaluate(() => JSON.stringify(window.cart));
  assert(cartContent && (cartContent.includes('Kotteri') || cartContent.includes('Broth')), 'Cart contains custom ramen attributes');

  await orderPage.close();

  await browser.close();

  console.log(`\n🏁 Test Run Completed: ${passedAssertions}/${totalAssertions} assertions passed.`);
  if (passedAssertions === totalAssertions) {
    console.log('🎉 ALL ASSERTIONS PASSED WITH 100% SUCCESS!');
  } else {
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
