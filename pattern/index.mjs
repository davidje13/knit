import { Preview } from './Preview.mjs';
import { EditorPage } from './EditorPage.mjs';
import { debounce } from './debounce.mjs';
import { compressImage, decompressImage } from './export/image.mjs';
import { el } from './dom.mjs';

const favicon = el('link', { 'rel': 'icon' });
document.head.append(favicon);

const DEFAULT_PALETTE = [
  0xFFFFFF,
  0x000000,
  0xAA3311,
  0xDD9922,
  0x339966,
  0x1188BB,
  0x8833BB,
];

const editor = new EditorPage({
  width: 10,
  height: 10,
  cellWidth: 16,
  cellHeight: 16,
  palette: DEFAULT_PALETTE,
});

let lastHash = null;

function loadHash() {
  const hash = window.location.hash.substring(1);
  if (hash === lastHash) {
    // this is the hash we just saved
    return;
  }
  lastHash = hash;
  if (!hash) {
    editor.setPalette(DEFAULT_PALETTE);
    editor.clear();
    return;
  }
  const image = decompressImage(decodeURIComponent(hash));
  editor.setPalette(image.palette ?? DEFAULT_PALETTE);
  editor.setGrid(image);
}

window.addEventListener('hashchange', loadHash);

const preview = new Preview();
function updatePage() {
  favicon.setAttribute('href', editor.editorView.canvas.toDataURL());
  lastHash = encodeURIComponent(compressImage(editor.getGrid(), editor.palette));
  window.location.hash = '#' + lastHash;
}
const debouncedUpdatePage = debounce(updatePage, 300);
function updatePreview() {
  preview.setTextureFrom(editor.editorView.canvas);
}
document.body.append(editor.menu, el('div', { 'class': 'display' }, [
  editor.container,
  el('div', { 'class': 'preview' }, [preview.canvas]),
]));
editor.editorView.addEventListener('rendered', updatePreview);
editor.editorView.addEventListener('rendered', debouncedUpdatePage);
loadHash();
updatePreview();
updatePage();
