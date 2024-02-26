import { GridView } from './GridView.mjs';
import { Resizer } from './Resizer.mjs';
import { mirrorX, mirrorY, transpose, shift } from './actions.mjs';
import { el, makeButton } from './dom.mjs';

export class EditorPage extends EventTarget {
  constructor({ width, height, cellWidth, cellHeight, palette }) {
    super();

    this.palette = palette;
    this.activePalette = 1;

    this.editorView = new GridView({
      width,
      height,
      cellWidth,
      cellHeight,
      border: 2,
      fill: 0,
      getChange: (v, alt) => (v === this.activePalette && !alt) ? 0 : this.activePalette,
    });

    const editorChanged = () => {
      this.dispatchEvent(new CustomEvent('change', { detail: { grid: this.getGrid() } }));
    };

    this.editorView.addEventListener('change', editorChanged);

    const editorResizer = new Resizer(this.editorView.container, {
      getCurrentSize: () => this.editorView.getGrid(),
      xScale: this.editorView.getTotalCellSize().width,
      yScale: this.editorView.getTotalCellSize().height,
      xMin: 1,
      yMin: 1,
    });

    editorResizer.addEventListener('change', ({ detail }) => this.editorView.resize({
      width: detail.width,
      height: detail.height,
      dx: detail.dx,
      dy: detail.dy,
      fill: 0,
    }));

    const applyAction = (...actions) => {
      let d = this.editorView.getGrid();
      for (const action of actions) {
        d = action(d);
      }
      this.editorView.setGrid(d);
    };

    this.palettePicker = el('div');
    const pickers = [];

    const updatePalette = () => {
      for (const { btn, fn } of pickers) {
        btn.removeEventListener('click', fn);
        btn.remove();
      }
      pickers.length = 0;
      for (let i = 0; i < this.palette.length; ++i) {
        const v = this.palette[i];
        const fn = () => {
          if (pickers[this.activePalette]) {
            pickers[this.activePalette].btn.removeAttribute('data-active');
          }
          this.activePalette = i;
          pickers[this.activePalette].btn.setAttribute('data-active', 'active');
        };
        const sample = el('div', { 'class': 'sample' });
        sample.style.setProperty('--col', '#' + v.toString(16).padStart(6, '0'));
        const btn = makeButton(sample, `palette ${i + 1}`, fn);
        pickers.push({ btn, fn });
        this.palettePicker.append(btn);
      }
      if (pickers[this.activePalette]) {
        pickers[this.activePalette].btn.setAttribute('data-active', 'active');
      }
      this.editorView.setPalette(this.palette);
    };

    this.menu = el('div', { 'class': 'menu' }, [
      this.palettePicker,
      el('div', {}, [
        makeButton('\u2194', 'flip horizontally', () => applyAction(mirrorX)),
        makeButton('\u2195', 'flip vertically', () => applyAction(mirrorY)),
      ]),
      el('div', {}, [
        makeButton('\u2190', 'pan left', () => applyAction(shift(1, 0))),
        makeButton('\u2192', 'pan right', () => applyAction(shift(-1, 0))),
        makeButton('\u2191', 'pan up', () => applyAction(shift(0, 1))),
        makeButton('\u2193', 'pan down', () => applyAction(shift(0, -1))),
      ]),
      el('div', {}, [
        makeButton('\u21BB', 'rotate clockwise', () => applyAction(transpose, mirrorX)),
        makeButton('\u21BA', 'rotate counter-clockwise', () => applyAction(transpose, mirrorY)),
      ]),
    ]);

    this.container = editorResizer.container;

    updatePalette();
    editorChanged();
  }

  clear() {
    this.editorView.fill(0);
  }

  getGrid() {
    return this.editorView.getGrid();
  }

  setGrid(grid) {
    this.editorView.setGrid(grid);
  }
}
