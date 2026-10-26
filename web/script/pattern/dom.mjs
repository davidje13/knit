/**
 * @template {keyof HTMLElementTagNameMap} K
 * @param {K} tag
 * @param {Record<string, string>} attributes
 * @param {(HTMLElement | string)[]} children
 * @return {HTMLElementTagNameMap[K]}
 */
export function el(tag, attributes = {}, children = []) {
  const o = document.createElement(tag);
  for (const [k, v] of Object.entries(attributes)) {
    o.setAttribute(k, v);
  }
  o.append(...children);
  return o;
}

/**
 * @param {HTMLElement | string} text
 * @param {string} title
 * @param {(e: PointerEvent) => void} fn
 */
export function makeButton(text, title, fn) {
  const btn = el('button', { type: 'button', title }, [text]);
  btn.addEventListener('click', fn);
  return btn;
}
