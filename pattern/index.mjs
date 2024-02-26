import { Preview } from './Preview.mjs';
import { EditorPage } from './EditorPage.mjs';
import { debounce } from './debounce.mjs';
import { el } from './dom.mjs';

const favicon = el('link', { 'rel': 'icon' });
document.head.append(favicon);

const editor = new EditorPage({
  width: 10,
  height: 10,
  cellWidth: 16,
  cellHeight: 16,
  palette: [
    0xFFFFFF,
    0x000000,
    0xAA3311,
    0xDD9922,
    0x339966,
    0x1188BB,
    0x8833BB,
  ],
});

const preview = new Preview();
function updatePage() {
  favicon.setAttribute('href', editor.editorView.canvas.toDataURL());
}
const debouncedUpdatePage = debounce(updatePage, 500);
function updatePreview() {
  preview.setTextureFrom(editor.editorView.canvas);
}
document.body.append(editor.menu, el('div', { 'class': 'display' }, [
  editor.container,
  el('div', { 'class': 'preview' }, [preview.canvas]),
]));
editor.editorView.addEventListener('rendered', updatePreview);
editor.editorView.addEventListener('rendered', debouncedUpdatePage);
updatePreview();
updatePage();
