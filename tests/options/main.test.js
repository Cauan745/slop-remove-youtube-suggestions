const { describe, it } = require('node:test');
const assert = require('node:assert');
const { loadSourceFile } = require('../setup');

function makeElement() {
  const attributes = {};
  const listeners = {};
  const children = [];
  const element = {
    children,
    value: '',
    className: '',
    innerText: '',
    addEventListener(type, listener) {
      listeners[type] = listener;
    },
    getListener(type) {
      return listeners[type];
    },
    append(...nodes) {
      nodes.forEach(node => {
        node.parentNode = element;
        children.push(node);
      });
    },
    insertBefore(node, before) {
      node.parentNode = element;
      const index = children.indexOf(before);
      children.splice(index < 0 ? children.length : index, 0, node);
    },
    querySelectorAll(selector) {
      return selector === '.pill' ? children.filter(node => node.className === 'pill') : [];
    },
    after(node) {
      element.nextSibling = node;
    },
    remove() {
      if (!element.parentNode) return;
      const index = element.parentNode.children.indexOf(element);
      if (index >= 0) element.parentNode.children.splice(index, 1);
    },
    setAttribute(name, value) {
      attributes[name] = String(value);
    },
    getAttribute(name) {
      return name in attributes ? attributes[name] : null;
    },
    removeAttribute(name) {
      delete attributes[name];
    },
  };
  return element;
}

function loadOptionsMain() {
  const elements = new Map();
  const getElement = id => {
    if (!elements.has(id)) elements.set(id, makeElement());
    return elements.get(id);
  };
  const documentElement = makeElement();
  const document = {
    documentElement,
    addEventListener: () => {},
    getElementById: getElement,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => makeElement(),
  };
  const shared = loadSourceFile('shared/main.js');
  const main = loadSourceFile('options/main.js', {
    document,
    window: {},
    parseGrayscaleExemptChannels: shared.parseGrayscaleExemptChannels,
  });
  return { document, elements, main };
}

describe('Options popup initialization', () => {
  it('initializes grayscale exceptions without throwing', () => {
    const { document, elements, main } = loadOptionsMain();

    document.documentElement.setAttribute('grayscale_exempt_channels', '@veritasium');
    assert.doesNotThrow(() => main.initGrayscaleExemptUI('@Veritasium, kurzgesagt'));
    const option = elements.get('grayscale_mode');
    const container = elements.get('grayscale_exempt_container');
    const pillBox = elements.get('grayscale_pill_box');
    const input = elements.get('grayscale_pill_input');
    assert.strictEqual(option.nextSibling, container);
    assert.strictEqual(container.getAttribute('hidden'), null);
    assert.strictEqual(pillBox.querySelectorAll('.pill').length, 2);
    assert.strictEqual(typeof input.getListener('keydown'), 'function');
  });
});
