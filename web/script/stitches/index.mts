import { el } from '../dom.mts';
import {
	BIND_OFF,
	CAST_ON,
	findRepetitions,
	KNIT,
	PLACE_MARKER,
	plural,
	type Block,
	type Cell,
} from './cells.mts';
import { toInstructions } from './instructions.mts';
import { INTERPOLATION } from './interpolation.mts';
import { DECREASE, INCREASE } from './methods.mts';
import { SPACING, spacingPos } from './spacing.mts';

const form = document.getElementsByTagName('form')[0]!;
const inBegin = form.elements.namedItem('begin') as HTMLInputElement;
const inEnd = form.elements.namedItem('end') as HTMLInputElement;
const inRows = form.elements.namedItem('rows') as HTMLInputElement;
const inInterpolation = form.elements.namedItem(
	'interpolation',
) as HTMLSelectElement;
const inSpacing = form.elements.namedItem('spacing') as HTMLSelectElement;
const inSymmetrical = form.elements.namedItem(
	'symmetrical',
) as HTMLInputElement;
const inDir = form.elements.namedItem('dir') as HTMLSelectElement;
const inDir1 = form.elements.namedItem('dir-1') as HTMLSelectElement;
const inIncludeCastOn = form.elements.namedItem('cast-on') as HTMLInputElement;
const inIncludeBindOff = form.elements.namedItem(
	'bind-off',
) as HTMLInputElement;
const inPurlNop = form.elements.namedItem('purl-nop') as HTMLInputElement;
const inTypeDecrease = form.elements.namedItem(
	'type-decrease',
) as HTMLSelectElement;
const inTypeIncrease = form.elements.namedItem(
	'type-increase',
) as HTMLSelectElement;
const inLimit = form.elements.namedItem('limit') as HTMLInputElement;

const oBeginPlural = document.getElementById('begin-plural')!;
const oEndPlural = document.getElementById('end-plural')!;
const oRowsPlural = document.getElementById('rows-plural')!;
const oInterpolation = document.getElementById('interpolation')!;
const oSymmetrical = document.getElementById('symmetrical')!;
const oDir = document.getElementById('dir')!;
const oPurlNop = document.getElementById('purl-nop')!;
const oDecrease = document.getElementById('decrease')!;
const oIncrease = document.getElementById('increase')!;
const oLimit = document.getElementById('limit')!;
const oLimitLabel = document.getElementById('limit-label')!;
const oCastOn = document.getElementById('cast-on')!;
const oBindOff = document.getElementById('bind-off')!;
const oResult = document.getElementById('result')!;

const oVis = el('canvas', { class: 'vis' });
const ctxVis = oVis.getContext('2d');

interface RowData {
	n: number;
	stitches: number;
	cells: Cell[];
	reducedCells: Block[];
	instructions: (HTMLElement | string)[];
	purl: boolean;
}

function readNum(o: HTMLInputElement, min: number) {
	const v = o.valueAsNumber;
	return Number.isNaN(v) || v < min ? min : v;
}

function update() {
	oResult.replaceChildren();
	const begin = readNum(inBegin, 0);
	oBeginPlural.hidden = begin === 1;
	const end = readNum(inEnd, 0);
	oEndPlural.hidden = end === 1;
	const rows = readNum(inRows, 1) | 0;
	oRowsPlural.hidden = rows === 1;
	const beginInt = Math.round(begin);
	const endInt = Math.round(end);

	oInterpolation.hidden = rows < 2 || beginInt === endInt;
	const interpolation = INTERPOLATION.get(
		rows < 2 ? 'linear' : inInterpolation.value,
	);

	const spacingID = inSpacing.value;
	const spacing =
		SPACING.get(spacingID) ?? spacingPos(Number.parseFloat(spacingID));
	const allowSymmetry = ['sides', '0.5'].includes(spacingID);
	oSymmetrical.hidden = !allowSymmetry;
	const symmetrical = allowSymmetry ? inSymmetrical.checked : false;
	oDir.hidden = rows === 1;
	const dir = rows === 1 ? 'ss' : inDir.value;
	const dir1 = inDir1.value;
	oCastOn.hidden = !beginInt;
	oBindOff.hidden = !endInt;
	const includeCastOn = inIncludeCastOn.checked;
	const includeBindOff = inIncludeBindOff.checked;
	oDecrease.hidden = end >= begin;
	const typeDecrease = DECREASE.get(inTypeDecrease.value);
	oIncrease.hidden = end <= begin;
	const typeIncrease = INCREASE.get(inTypeIncrease.value);
	oPurlNop.hidden = beginInt === endInt || dir !== 'ss' || rows < 2;
	const purlNop = dir === 'ss' && rows >= 2 && inPurlNop.checked;

	if (
		Number.isNaN(begin) ||
		Number.isNaN(end) ||
		Number.isNaN(rows) ||
		begin < 0 ||
		end < 0 ||
		rows < 1 ||
		!interpolation ||
		!spacing ||
		!typeDecrease ||
		!typeIncrease
	) {
		return;
	}

	oLimit.hidden = Boolean(
		end === begin ||
		(end > begin &&
			typeIncrease.to - typeIncrease.from < 2 &&
			(typeIncrease.from > 0 || typeIncrease.noAdjacent)) ||
		(end < begin &&
			typeDecrease.from - typeDecrease.to < 2 &&
			(typeDecrease.to > 0 || typeDecrease.noAdjacent)),
	);
	oLimitLabel.textContent = end > begin ? 'Max. increase' : 'Max. decrease';
	const limit = readNum(inLimit, 1) | 0;

	const rowData: RowData[] = [];
	let n = 0;
	const isPurl =
		dir === 'ss'
			? (n: number) => Boolean(n & 1) === (dir1 === 'p')
			: () => dir1 === 'p';
	if (includeCastOn && beginInt > 0) {
		rowData.push({
			n: -1,
			purl: isPurl(-1),
			stitches: 0,
			cells: [],
			reducedCells: [],
			instructions: [],
		});
	}
	const shapeBegin = n;
	const fn = interpolation(begin, end);
	const odd = Math.max(beginInt, endInt) & 1;
	for (let row = 0; row <= rows; ++row) {
		const purl = isPurl(n);
		let pos: number;
		if (purlNop) {
			const l = isPurl(n - row) ? -0.5 : 0.5;
			const h = rows + (isPurl(rows + n - row) ? -0.5 : 0.5);
			pos = (row + (purl ? -0.5 : 0.5) - l) / (h - l);
		} else {
			pos = row / rows;
		}
		let stitchesFract = fn(pos);
		if (Number.isNaN(stitchesFract)) {
			stitchesFract = 0;
		}
		const stitches =
			symmetrical && row !== 0 && row !== rows
				? Math.round((stitchesFract - odd) / 2) * 2 + odd
				: Math.round(stitchesFract);
		rowData.push({
			n,
			purl,
			stitches,
			cells: [],
			reducedCells: [],
			instructions: [],
		});
		n++;
	}
	if (includeBindOff && endInt > 0) {
		rowData.push({
			n,
			purl: isPurl(n),
			stitches: 0,
			cells: [],
			reducedCells: [],
			instructions: [],
		});
		n++;
	}

	if (ctxVis && rows > 1) {
		const align = spacingID === '0' ? 0 : spacingID === '1' ? 1 : 0.5;
		let maxW = 0;
		for (const row of rowData) {
			if (row.stitches > maxW) {
				maxW = row.stitches;
			}
		}
		const CELL_SIZE = 10;
		oVis.width = maxW * CELL_SIZE;
		oVis.height = n * CELL_SIZE;
		ctxVis.clearRect(0, 0, maxW * CELL_SIZE, n * CELL_SIZE);
		ctxVis.fillStyle = '#808080';
		for (const row of rowData) {
			ctxVis.fillRect(
				Math.ceil((maxW - row.stitches) * (1 - align)) * CELL_SIZE,
				(n - row.n - 1) * CELL_SIZE,
				row.stitches * CELL_SIZE,
				CELL_SIZE,
			);
		}
		ctxVis.fillStyle = '#00000080';
		for (const row of rowData) {
			ctxVis.fillRect(0, (n - row.n) * CELL_SIZE - 1, maxW * CELL_SIZE, 1);
		}
		for (let x = 1; x < maxW; ++x) {
			ctxVis.fillRect(x * CELL_SIZE - 1, 0, 1, n * CELL_SIZE);
		}
		ctxVis.strokeStyle = '#CC0000CC';
		ctxVis.lineWidth = 2;
		ctxVis.beginPath();
		for (let r = 0; r <= rows; r += 0.125) {
			const x = (maxW + (fn(r / rows) - maxW) * align) * CELL_SIZE;
			const y = (n - r - shapeBegin - 0.5) * CELL_SIZE;
			if (r) {
				ctxVis.lineTo(x, y);
			} else {
				ctxVis.moveTo(x, y);
			}
		}
		ctxVis.stroke();
		ctxVis.beginPath();
		for (let r = 0; r <= rows; r += 0.125) {
			const x = (maxW - fn(r / rows)) * (1 - align) * CELL_SIZE;
			const y = (n - r - shapeBegin - 0.5) * CELL_SIZE;
			if (r) {
				ctxVis.lineTo(x, y);
			} else {
				ctxVis.moveTo(x, y);
			}
		}
		ctxVis.stroke();
		oResult.append(el('h2', {}, ['Row Lengths']), oVis);
	}

	let prev: RowData | null = null;
	const spacer = spacing(limit);
	try {
		for (const row of rowData) {
			if (!prev) {
				prev = row;
				continue;
			}

			if (!prev.stitches && row.stitches) {
				for (let i = 0; i < row.stitches; ++i) {
					row.cells.push(CAST_ON);
				}
				if (dir === 'round') {
					row.cells.push(PLACE_MARKER);
				}
			} else if (prev.stitches && !row.stitches) {
				for (let i = 0; i < prev.stitches; ++i) {
					row.cells.push(BIND_OFF);
				}
			} else if (prev.stitches === row.stitches) {
				for (let i = 0; i < row.stitches; ++i) {
					row.cells.push(KNIT);
				}
			} else {
				row.cells = spacer(
					prev.stitches,
					row.stitches,
					row.stitches > prev.stitches ? typeIncrease : typeDecrease,
					row.purl,
					row.n,
					dir === 'round' && prev.cells[0] !== CAST_ON,
				);
			}
			row.reducedCells = findRepetitions(row.cells);
			row.instructions = toInstructions(row.reducedCells, row.purl);

			prev = row;
		}
	} catch (err) {
		oResult.append(
			el('p', {}, [
				'Unable to achieve this shape with the selected increase / decrease: ' +
					(err instanceof Error ? err.message : String(err)),
			]),
		);
		return;
	}

	oResult.append(el('h2', {}, ['Instructions']));
	if (!includeCastOn && beginInt > 0) {
		oResult.append(
			el('div', {}, [
				'Starting with ',
				plural(beginInt, 'stitch', 'stitches'),
				',',
			]),
		);
	}
	const instructionBlock = el('div', { class: 'instructions' });
	for (const row of rowData) {
		if (!row.instructions.length) {
			continue;
		}
		instructionBlock.append(
			el(
				'h3',
				{ class: 'num' },
				row.n
					? [
							el('strong', {}, [
								dir === 'round' ? `Round ${row.n}` : `Row ${row.n}`,
							]),
							':',
						]
					: [],
			),
			el('div', { class: 'text' }, row.instructions),
			el(
				'div',
				{ class: 'total' },
				row.stitches > 0
					? [
							'(total ',
							el(
								'abbr',
								{ title: plural(row.stitches, 'stitch', 'stitches') },
								[plural(row.stitches, 'st')],
							),
							')',
						]
					: [],
			),
		);
	}
	oResult.append(instructionBlock);
	// TODO: display grid view (bottom-to-top)
	// k2tog = \u2227
	// k3tog = \u2A5A
}

for (const i of form.elements) {
	i.addEventListener('input', update);
}
update();
