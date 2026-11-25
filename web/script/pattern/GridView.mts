import { el } from '../dom.mts';

const cGridMinor = '#80808033';
const cGridMajor = '#80808099';

export interface Image {
	width: number;
	height: number;
	data: Uint8Array;
}

type GetChange = (current: number, alt: boolean) => number | null | undefined;

export class GridView extends EventTarget {
	declare private readonly dpr: number;
	private w = 0;
	private h = 0;
	private lastw = -1;
	private lasth = -1;
	declare private readonly cw: number;
	declare private readonly ch: number;
	declare private readonly getChange: GetChange;
	declare private readonly border: number;
	declare private readonly majorX: number;
	declare private readonly majorY: number;
	private values = new Uint8Array(0);
	private palette: string[] = [];
	private dirty = false;
	private _readonly = false;
	private updating: { pointer: number; value: number } | null = null;

	declare readonly canvas: HTMLCanvasElement;
	declare private readonly ctx: CanvasRenderingContext2D;

	declare private readonly referenceImage: HTMLDivElement;

	declare private readonly gridCanvas: HTMLCanvasElement;
	declare private readonly gridCtx: CanvasRenderingContext2D;

	declare readonly container: HTMLElement;

	constructor({
		width = 0,
		height = 0,
		majorX = 5,
		majorY = 5,
		cellWidth,
		cellHeight,
		border = 2,
		fill = 0,
		getChange = () => null,
	}: {
		width?: number;
		height?: number;
		majorX?: number;
		majorY?: number;
		cellWidth: number;
		cellHeight: number;
		border?: number;
		fill?: number;
		getChange?: GetChange;
	}) {
		super();
		this.dpr = Math.min(2, window.devicePixelRatio || 1);
		this.cw = cellWidth * this.dpr;
		this.ch = cellHeight * this.dpr;
		this.getChange = getChange;
		this.border = border * this.dpr;
		this.majorX = majorX;
		this.majorY = majorY;
		this.values = new Uint8Array(0);

		this.canvas = el('canvas', { class: 'grid-view-image' });
		this.ctx = this.canvas.getContext('2d', {
			alpha: false,
			willReadFrequently: true,
		})!;

		this.referenceImage = el('div', { class: 'grid-view-reference' });

		this.gridCanvas = el('canvas', { class: 'grid-view-grid' });
		this.gridCtx = this.gridCanvas.getContext('2d', {
			alpha: true,
			willReadFrequently: false,
		})!;

		this.container = el('div', { class: 'grid-view' }, [
			this.canvas,
			this.referenceImage,
			this.gridCanvas,
		]);

		this._md = this._md.bind(this);
		this._mm = this._mm.bind(this);
		this._mu = this._mu.bind(this);
		this._mc = this._mc.bind(this);

		this.container.addEventListener('pointerdown', this._md, {
			passive: false,
		});
		this.container.addEventListener('contextmenu', prevent, { passive: false });

		this.setPalette([0xffffff, 0x000000]);
		this.resize({ width, height, fill });
	}

	setPalette(palette: number[]) {
		this.palette = palette.map((p) => '#' + p.toString(16).padStart(6, '0'));
		this._markDirty();
	}

	private _removePointerEvents() {
		if (this.updating) {
			window.removeEventListener('pointermove', this._mm);
			window.removeEventListener('pointerup', this._mu);
			window.removeEventListener('pointercancel', this._mc);
			this.container.releasePointerCapture(this.updating.pointer);
			this.updating = null;
		}
	}

	destroy() {
		this.dirty = false;
		this.container.removeEventListener('pointerdown', this._md);
		this.container.removeEventListener('contextmenu', prevent);
		this._removePointerEvents();
	}

	setReadOnly(readonly = true) {
		if (readonly && !this._readonly) {
			this._removePointerEvents();
		}
		this._readonly = readonly;
	}

	private _getCell(e: PointerEvent) {
		const bounds = this.container.getBoundingClientRect();
		const x = Math.floor(((e.clientX - bounds.left) * this.dpr) / this.cw);
		const y = Math.floor(((e.clientY - bounds.top) * this.dpr) / this.ch);
		if (x < 0 || x >= this.w || y < 0 || y >= this.h) {
			return null;
		}
		return { x, y };
	}

	private _md(e: PointerEvent) {
		if (this.updating || this._readonly) {
			return;
		}
		e.preventDefault();
		const c = this._getCell(e);
		if (!c) {
			return;
		}
		const updated = this.getChange(
			this.values[c.y * this.w + c.x]!,
			e.button > 0 || e.altKey,
		);
		if (updated === undefined || updated === null) {
			return;
		}
		this.updating = { pointer: e.pointerId, value: updated };
		this.container.setPointerCapture(e.pointerId);
		window.addEventListener('pointermove', this._mm, { passive: false });
		window.addEventListener('pointerup', this._mu, { passive: false });
		window.addEventListener('pointercancel', this._mc, { passive: true });
		this._mm(e);
	}

	private _mm(e: PointerEvent) {
		if (e.pointerId !== this.updating?.pointer || this._readonly) {
			return;
		}
		e.preventDefault();
		const c = this._getCell(e);
		if (c) {
			this.setCell(c.x, c.y, this.updating.value);
		}
	}

	private _mu(e: PointerEvent) {
		if (e.pointerId !== this.updating?.pointer) {
			return;
		}
		this._mm(e);
		this._removePointerEvents();
	}

	private _mc(e: PointerEvent) {
		if (e.pointerId !== this.updating?.pointer) {
			return;
		}
		this._removePointerEvents();
	}

	setReferenceImage(url: string) {
		this.referenceImage.style.backgroundImage = url ? `url(${url})` : 'none';
	}

	getGrid(): Image {
		return { width: this.w, height: this.h, data: this.values };
	}

	setGrid({
		width,
		height,
		data,
	}: {
		width: number;
		height: number;
		data: ArrayLike<number>;
	}) {
		if (width <= 0 || height <= 0) {
			throw new Error('invalid size');
		}
		if (this.w !== width || this.h !== height) {
			this.w = width;
			this.h = height;
			this.values = new Uint8Array(this.w * this.h);
		}
		this.values.set(data, 0);
		this.dispatchEvent(new CustomEvent('change', { detail: this.getGrid() }));
		this._markDirty();
	}

	getTotalCellSize() {
		return {
			width: this.cw / this.dpr,
			height: this.ch / this.dpr,
		};
	}

	fill(fill = 0) {
		this.values.fill(fill);
		this.dispatchEvent(new CustomEvent('change', { detail: this.getGrid() }));
		this._markDirty();
	}

	setCell(x: number, y: number, value: number) {
		const p = y * this.w + x;
		if (this.values[p] !== value) {
			this.values[p] = value;
			this.dispatchEvent(
				new CustomEvent('change', { detail: { ...this.getGrid(), x, y } }),
			);
			this._markDirty();
		}
	}

	resize({
		width = null,
		height = null,
		fill = 0,
		dx = 0,
		dy = 0,
	}: {
		width?: number | null;
		height?: number | null;
		fill?: number;
		dx?: number;
		dy?: number;
	}) {
		const oldW = this.w;
		const oldH = this.h;
		const oldValues = this.values;
		if ((width && width < 0) || (height && height < 0)) {
			throw new Error('invalid size');
		}
		this.w = width ?? oldW;
		this.h = height ?? oldH;
		this.values = new Uint8Array(this.w * this.h);
		for (let y = 0; y < this.h; ++y) {
			const oy = y - dy;
			if (oy >= 0 && oy < oldH) {
				for (let x = 0; x < this.w; ++x) {
					const ox = x - dx;
					if (ox >= 0 && ox < oldW) {
						this.values[y * this.w + x] = oldValues[oy * oldW + ox]!;
					} else {
						this.values[y * this.w + x] = fill;
					}
				}
			} else {
				for (let x = 0; x < this.w; ++x) {
					this.values[y * this.w + x] = fill;
				}
			}
		}
		this.dispatchEvent(new CustomEvent('change', { detail: this.getGrid() }));
		this._markDirty();
	}

	private _markDirty() {
		if (!this.dirty) {
			this.dirty = true;
			Promise.resolve().then(() => this._draw());
		}
	}

	private _drawGrid() {
		const { w, h, cw, ch, border, majorX, majorY } = this;

		const fullWidth = w * cw;
		const fullHeight = h * ch;
		this.gridCtx.clearRect(0, 0, fullWidth, fullHeight);
		for (let x = 0; x <= w; ++x) {
			this.gridCtx.fillStyle = x % majorX === 0 ? cGridMajor : cGridMinor;
			this.gridCtx.fillRect(x * cw - border * 0.5, 0, border, fullHeight);
		}
		for (let y = 0; y <= h; ++y) {
			this.gridCtx.fillStyle = y % majorY === 0 ? cGridMajor : cGridMinor;
			this.gridCtx.fillRect(0, y * ch - border * 0.5, fullWidth, border);
		}
	}

	private _draw() {
		if (!this.dirty) {
			return;
		}
		this.dirty = false;

		const { w, h, cw, ch } = this;

		const fullWidth = w * cw;
		const fullHeight = h * ch;
		if (this.lastw !== fullWidth || this.lasth !== fullHeight) {
			this.canvas.width = w;
			this.canvas.height = h;
			this.canvas.style.width = `${fullWidth / this.dpr}px`;
			this.canvas.style.height = `${fullHeight / this.dpr}px`;
			this.gridCanvas.width = fullWidth;
			this.gridCanvas.height = fullHeight;
			this.gridCanvas.style.width = `${fullWidth / this.dpr}px`;
			this.gridCanvas.style.height = `${fullHeight / this.dpr}px`;
			this.lastw = fullWidth;
			this.lasth = fullHeight;
			this._drawGrid();
		}

		for (let y = 0; y < h; ++y) {
			for (let x = 0; x < w; ++x) {
				this.ctx.fillStyle = this.palette[this.values[y * w + x]!]!;
				this.ctx.fillRect(x, y, 1, 1);
			}
		}
		this.dispatchEvent(new CustomEvent('rendered', { detail: this.canvas }));
	}
}

function prevent(e: Event) {
	e.preventDefault();
}
