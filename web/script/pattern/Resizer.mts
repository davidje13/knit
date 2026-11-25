import { el } from '../dom.mts';

export class Resizer extends (EventTarget as TypedEventTarget<{
	change: { detail: { width: number; height: number; dx: number; dy: number } };
}>) {
	declare private readonly _getCurrentSize: GetSize;
	declare private readonly _getLabel: GetLabel;
	declare private readonly xScale: number;
	declare private readonly yScale: number;
	declare private readonly xMin: number;
	declare private readonly yMin: number;
	declare private readonly xMax: number;
	declare private readonly yMax: number;
	private dragState: DragState | null = null;
	declare readonly container: HTMLElement;
	declare private readonly previewLabel: HTMLElement;
	declare private readonly preview: HTMLElement;
	declare private readonly wrapper: HTMLElement;
	private readonly handles: HTMLElement[] = [];

	constructor(
		content: HTMLElement,
		{
			getCurrentSize = () => content.getBoundingClientRect(),
			getLabel = (w, h) => `${w}\u00D7${h}`,
			xScale = 1,
			yScale = 1,
			xMin = 0,
			yMin = 0,
			xMax = Number.POSITIVE_INFINITY,
			yMax = Number.POSITIVE_INFINITY,
		}: {
			getCurrentSize?: GetSize;
			getLabel?: GetLabel;
			xScale?: number;
			yScale?: number;
			xMin?: number;
			yMin?: number;
			xMax?: number;
			yMax?: number;
		} = {},
	) {
		super();

		this._getCurrentSize = getCurrentSize;
		this._getLabel = getLabel;
		this.xScale = xScale;
		this.yScale = yScale;
		this.xMin = xMin;
		this.yMin = yMin;
		this.xMax = xMax;
		this.yMax = yMax;

		this.container = el('div', { class: 'resizer' });

		this._md = this._md.bind(this);
		this._mm = this._mm.bind(this);
		this._mmk = this._mmk.bind(this);
		this._mu = this._mu.bind(this);
		this._mc = this._mc.bind(this);

		for (let i = 0; i < DIRECTIONS.length; ++i) {
			const handle = el('div', { class: `handle ${DIRECTIONS[i]!.className}` });
			handle.dataset['resizeIndex'] = String(i);
			handle.addEventListener('pointerdown', this._md, { passive: false });
			handle.addEventListener('contextmenu', prevent, { passive: false });
			this.container.append(handle);
			this.handles.push(handle);
		}
		this.previewLabel = el('div', { class: 'label' });
		this.preview = el('div', { class: 'resize-preview' }, [this.previewLabel]);
		this.wrapper = el('div', { class: 'resize-wrapper' }, [
			content,
			this.preview,
		]);
		this.container.append(this.wrapper);
	}

	private _removePointerEvents() {
		window.removeEventListener('pointermove', this._mm);
		window.removeEventListener('keydown', this._mmk);
		window.removeEventListener('keyup', this._mmk);
		window.removeEventListener('pointerup', this._mu);
		window.removeEventListener('pointercancel', this._mc);
		if (this.dragState) {
			this.dragState.handle.releasePointerCapture(this.dragState.pointer);
			this.dragState = null;
		}
	}

	destroy() {
		for (const handle of this.handles) {
			handle.removeEventListener('pointerdown', this._md);
			handle.removeEventListener('contextmenu', prevent);
		}
		this._removePointerEvents();
	}

	private _md(e: PointerEvent) {
		const handle = e.target as HTMLElement;
		const index = handle.dataset?.['resizeIndex'];
		if (index === undefined || e.button !== 0 || this.dragState !== null) {
			return;
		}
		e.preventDefault();
		handle.setPointerCapture(e.pointerId);
		const domSize = this.wrapper.getBoundingClientRect();
		const size = this._getCurrentSize();
		this.dragState = {
			pointer: e.pointerId,
			start: {
				x: e.clientX,
				y: e.clientY,
				width: size.width,
				height: size.height,
				padX: domSize.width - size.width * this.xScale,
				padY: domSize.height - size.height * this.yScale,
			},
			latest: { x: e.clientX, y: e.clientY, altKey: e.altKey },
			handle,
			mode: DIRECTIONS[Number(index)]!,
		};
		window.addEventListener('pointermove', this._mm, { passive: false });
		window.addEventListener('keydown', this._mmk, { passive: true });
		window.addEventListener('keyup', this._mmk);
		window.addEventListener('pointerup', this._mu, { passive: false });
		window.addEventListener('pointercancel', this._mc, { passive: true });
		this.preview.style.display = 'grid';
		this._mm(e);
	}

	private _updatePreview({ start, latest, mode }: DragState) {
		const mult = latest.altKey ? 2 : 1;
		const xDiff =
			Math.round((latest.x - start.x) / this.xScale) * mult * mode.x;
		const yDiff =
			Math.round((latest.y - start.y) / this.yScale) * mult * mode.y;
		const w = Math.max(this.xMin, Math.min(this.xMax, start.width + xDiff));
		const h = Math.max(this.yMin, Math.min(this.yMax, start.height + yDiff));

		const dx = (w - start.width) * (latest.altKey ? 0.5 : mode.x < 0 ? 1 : 0);
		const dy = (h - start.height) * (latest.altKey ? 0.5 : mode.y < 0 ? 1 : 0);

		this.preview.style.left = `${-dx * this.xScale}px`;
		this.preview.style.width = `${w * this.xScale + start.padX}px`;
		this.preview.style.top = `${-dy * this.yScale}px`;
		this.preview.style.height = `${h * this.yScale + start.padY}px`;
		const label = this._getLabel(w, h);
		if (label) {
			this.previewLabel.style.display = 'block';
			this.previewLabel.textContent = label;
		} else {
			this.previewLabel.style.display = 'none';
		}

		return { w, h, dx, dy };
	}

	private _mm(e: PointerEvent) {
		if (e.pointerId !== this.dragState?.pointer) {
			return;
		}
		e.preventDefault();
		this.dragState.latest = { x: e.clientX, y: e.clientY, altKey: e.altKey };
		this._updatePreview(this.dragState);
	}

	private _mmk(e: KeyboardEvent) {
		if (this.dragState && this.dragState.latest.altKey !== e.altKey) {
			this.dragState.latest.altKey = e.altKey;
			this._updatePreview(this.dragState);
		}
	}

	private _mu(e: PointerEvent) {
		if (e.pointerId !== this.dragState?.pointer) {
			return;
		}
		this.dragState.latest = { x: e.clientX, y: e.clientY, altKey: e.altKey };
		const { w, h, dx, dy } = this._updatePreview(this.dragState);
		const { start } = this.dragState;
		this._removePointerEvents();
		this.preview.style.display = 'none';
		this.preview.style.left = '0';
		this.preview.style.width = '0';
		this.preview.style.top = '0';
		this.preview.style.height = '0';
		this.previewLabel.textContent = '';
		if (w !== start.width || h !== start.height || dx !== 0 || dy !== 0) {
			this.dispatchEvent(
				new CustomEvent('change', {
					detail: {
						width: w,
						height: h,
						// dx/dy can be fractional if Alt is held and the grid is constrained by a boundary limit
						dx: Math.ceil(dx),
						dy: Math.ceil(dy),
					},
				}),
			);
		}
	}

	private _mc(e: PointerEvent) {
		if (e.pointerId !== this.dragState?.pointer) {
			return;
		}
		this._removePointerEvents();
		this.preview.style.display = 'none';
		this.preview.style.left = '0';
		this.preview.style.width = '0';
		this.preview.style.top = '0';
		this.preview.style.height = '0';
		this.previewLabel.textContent = '';
	}
}

function prevent(e: Event) {
	e.preventDefault();
}

interface Direction {
	className: string;
	x: number;
	y: number;
}

interface DragState {
	pointer: number;
	start: {
		x: number;
		y: number;
		width: number;
		height: number;
		padX: number;
		padY: number;
	};
	latest: { x: number; y: number; altKey: boolean };
	handle: HTMLElement;
	mode: Direction;
}

type GetSize = () => { width: number; height: number };
type GetLabel = (width: number, height: number) => string;

const DIRECTIONS: Direction[] = [
	{ className: 'n', x: 0, y: -1 },
	{ className: 'w', x: -1, y: 0 },
	{ className: 's', x: 0, y: 1 },
	{ className: 'e', x: 1, y: 0 },
	{ className: 'nw', x: -1, y: -1 },
	{ className: 'ne', x: 1, y: -1 },
	{ className: 'sw', x: -1, y: 1 },
	{ className: 'se', x: 1, y: 1 },
];

type TypedEventListener<T extends Event> = (e: T) => void;
type TypedEventListenerObject<T extends Event> = { handleEvent(e: T): void };
type TypedEventListenerOrEventListenerObject<T extends Event> =
	TypedEventListener<T> | TypedEventListenerObject<T>;

interface TypedEventTarget<T extends Record<string, unknown>> {
	new (): {
		addEventListener<const K extends keyof T>(
			type: K,
			listener: TypedEventListenerOrEventListenerObject<Event & T[K]>,
			options?: AddEventListenerOptions | boolean,
		): void;
		removeEventListener(
			type: string,
			callback: EventListenerOrEventListenerObject | null,
			options?: EventListenerOptions | boolean,
		): void;
		dispatchEvent(event: Event): boolean;
	};
}
