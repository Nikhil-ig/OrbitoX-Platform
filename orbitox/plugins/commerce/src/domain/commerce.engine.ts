import { StoreEngine } from './engines/store/store.engine';
import { ThemeEngine } from './engines/theme/theme.engine';
import { ComponentRegistry } from './engines/component/component.registry';
import { PageBuilderEngine } from './engines/page-builder/page-builder.engine';
import { ProductEngine } from './engines/product/product.engine';
import { CartEngine } from './engines/cart/cart.engine';
import { CheckoutEngine } from './engines/checkout/checkout.engine';
import { OrderEngine } from './engines/order/order.engine';
import { PaymentEngine } from './engines/payment/payment.engine';
import { MediaEngine } from './engines/media/media.engine';
import { CustomerEngine } from './engines/customer/customer.engine';
import { DiscountEngine } from './engines/discount/discount.engine';
import { ShippingEngine } from './engines/shipping/shipping.engine';
import { AnalyticsEngine } from './engines/analytics/analytics.engine';
import { StorefrontEngine } from './engines/storefront/storefront.engine';
import { AICommerceEngine } from './engines/ai/ai-commerce.engine';
import { ReviewEngine } from './engines/review/review.engine';
import { CurrencyEngine } from './engines/currency/currency.engine';
import { SectionLogicEngine } from './engines/logic/section-logic.engine';
import { ActivityEngine } from './engines/activity/activity.engine';
import { AutomationEngine } from './engines/automation/automation.engine';
import { SEOEngine } from './engines/seo/seo.engine';
import { AIAutopilotEngine } from './engines/ai/ai-autopilot.engine';
import { CustomComponentEngine } from './engines/component/custom-component.engine';
import { FlowEngine } from './engines/logic/flow.engine';
import { TemplateEngine } from './engines/template/template.engine';
import { generateCommerceSeedData } from './seed/commerce.seed';

/**
 * OrbitoX Commerce Engine Master Kernel
 * ─────────────────────────────────────────────────────────────
 * The single unified engine managing multi-tenancy, themes, templates, page builder,
 * products, carts, checkouts, orders, payments, reviews, currency, AI, section logic,
 * activity logging, automations, SEO, autopilot, custom components, flow graphs, and storefront resolution.
 */
export class CommerceEngine {
  readonly stores: StoreEngine;
  readonly themes: ThemeEngine;
  readonly templates: TemplateEngine;
  readonly components: typeof ComponentRegistry;
  readonly customComponents: CustomComponentEngine;
  readonly pages: PageBuilderEngine;
  readonly products: ProductEngine;
  readonly discounts: DiscountEngine;
  readonly shipping: ShippingEngine;
  readonly cart: CartEngine;
  readonly payments: PaymentEngine;
  readonly customers: CustomerEngine;
  readonly orders: OrderEngine;
  readonly media: MediaEngine;
  readonly analytics: AnalyticsEngine;
  readonly storefront: StorefrontEngine;
  readonly ai: AICommerceEngine;
  readonly reviews: ReviewEngine;
  readonly currency: CurrencyEngine;
  readonly logic: SectionLogicEngine;
  readonly flows: FlowEngine;
  readonly activity: ActivityEngine;
  readonly automations: AutomationEngine;
  readonly seo: SEOEngine;
  readonly autopilot: AIAutopilotEngine;

  constructor() {
    const seed = generateCommerceSeedData();

    this.stores = new StoreEngine(seed.stores);
    this.themes = new ThemeEngine();
    this.components = ComponentRegistry;
    this.customComponents = new CustomComponentEngine();
    this.pages = new PageBuilderEngine(seed.pages);
    this.templates = new TemplateEngine(this.themes, this.pages, this.stores);
    this.products = new ProductEngine(seed.products, seed.categories, seed.collections);
    this.discounts = new DiscountEngine();
    this.shipping = new ShippingEngine();
    this.cart = new CartEngine(this.products, this.discounts);
    this.payments = new PaymentEngine();
    this.customers = new CustomerEngine();
    this.orders = new OrderEngine(this.cart, this.products, this.payments, this.customers);
    this.media = new MediaEngine();
    this.analytics = new AnalyticsEngine(this.orders, this.products);
    this.storefront = new StorefrontEngine(this.stores, this.themes, this.pages, this.products);
    this.ai = new AICommerceEngine();
    this.reviews = new ReviewEngine();
    this.currency = new CurrencyEngine();
    this.logic = new SectionLogicEngine();
    this.flows = new FlowEngine();
    this.activity = new ActivityEngine();
    this.automations = new AutomationEngine();
    this.seo = new SEOEngine();
    this.autopilot = new AIAutopilotEngine();
  }
}

// Global Singleton Instance of Commerce Engine
export const commerceEngine = new CommerceEngine();


