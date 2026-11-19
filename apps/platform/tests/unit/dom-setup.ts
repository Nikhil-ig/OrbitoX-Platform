import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
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
g.CustomEvent = dom.window.CustomEvent;
g.getComputedStyle = dom.window.getComputedStyle;
g.MutationObserver = dom.window.MutationObserver;
g.localStorage = dom.window.localStorage;
g.sessionStorage = dom.window.sessionStorage;
g.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 0);
g.cancelAnimationFrame = (id: any) => clearTimeout(id);
