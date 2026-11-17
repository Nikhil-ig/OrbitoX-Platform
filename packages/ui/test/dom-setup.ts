import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost:3005/',
});

const g = globalThis as any;
g.window = dom.window;
g.document = dom.window.document;
if (!g.navigator) {
  Object.defineProperty(g, 'navigator', { value: dom.window.navigator, configurable: true });
}
g.HTMLElement = dom.window.HTMLElement;
g.HTMLInputElement = dom.window.HTMLInputElement;
g.HTMLTextAreaElement = dom.window.HTMLTextAreaElement;
g.HTMLButtonElement = dom.window.HTMLButtonElement;
g.Element = dom.window.Element;
g.Node = dom.window.Node;
g.NodeFilter = dom.window.NodeFilter;
g.Event = dom.window.Event;
g.KeyboardEvent = dom.window.KeyboardEvent;
g.MouseEvent = dom.window.MouseEvent;
if (!dom.window.PointerEvent) {
  class PointerEvent extends dom.window.MouseEvent {
    pointerId: number;
    pointerType: string;
    constructor(type: string, props: any = {}) {
      super(type, props);
      this.pointerId = props.pointerId ?? 0;
      this.pointerType = props.pointerType ?? 'mouse';
    }
  }
  dom.window.PointerEvent = PointerEvent as any;
  (dom.window.HTMLElement.prototype as any).onpointerdown = null;
  (dom.window.HTMLElement.prototype as any).onpointermove = null;
  (dom.window.HTMLElement.prototype as any).onpointerup = null;
  (dom.window.HTMLElement.prototype as any).onpointercancel = null;
}
g.PointerEvent = dom.window.PointerEvent;
g.CustomEvent = dom.window.CustomEvent;
g.getComputedStyle = dom.window.getComputedStyle;
g.MutationObserver = dom.window.MutationObserver;
g.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 0);
g.cancelAnimationFrame = (id: any) => clearTimeout(id);

if (!g.ResizeObserver) {
  g.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
