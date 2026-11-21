export function el<K extends keyof HTMLElementTagNameMap>(
	tag: K,
	attributes: Record<string, string> = {},
	children: (HTMLElement | string)[] = [],
): HTMLElementTagNameMap[K] {
	const o = document.createElement(tag);
	for (const [k, v] of Object.entries(attributes)) {
		o.setAttribute(k, v);
	}
	o.append(...children);
	return o;
}

export function makeButton(
	text: HTMLElement | string,
	title: string,
	fn: (e: PointerEvent) => void,
) {
	const btn = el('button', { type: 'button', title }, [text]);
	btn.addEventListener('click', fn);
	return btn;
}
