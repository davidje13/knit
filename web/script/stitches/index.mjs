const VIS_DEC = ['', '|', '/\\'];
const VIS_INC = ['', '|', "|'"];

const iHave = /** @type {HTMLInputElement} */ (document.getElementsByName('have')[0]);
const iNeed = /** @type {HTMLInputElement} */ (document.getElementsByName('need')[0]);
const oResult = document.getElementById('result');

function update() {
	const have = Number.parseInt(iHave.value);
	const need = Number.parseInt(iNeed.value);
	const from = Math.max(have, need);
	const to = Math.min(have, need);
	if (from > to * 2) {
		oResult.innerText = '-';
		return;
	}

	const ys = [];
	let D = -from;
	let y = 0;
	for (let x = 0; x < from; ++x) {
		D += 2 * to;
		ys.push(y);
		if (D > 0) {
			++y;
			D -= 2 * from;
		}
	}
	ys.push(-1);
	const result = [];
	let n = 0;
	let cury = 0;
	for (const y of ys) {
		if (y === cury) {
			++n;
		} else {
			result.push(n);
			n = 1;
			cury = y;
		}
	}
	const vis = need > have ? VIS_INC : VIS_DEC;
	oResult.innerText = result.map((n) => vis[n]).join('');
}

for (const i of [iHave, iNeed]) {
	i.addEventListener('input', update);
}
update();
