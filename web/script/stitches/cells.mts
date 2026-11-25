export interface Cell {
	chains: boolean;
	in: number;
	out: [number, number];
	str(wrongSide: boolean, n: number): string;
	long(wrongSide: boolean, n: number): string;
}

export interface Block {
	cells: Cell[];
	repetitions: number;
}

export const CAST_ON: Cell = {
	chains: true,
	in: 0,
	out: [0, 1],
	str: (ws, n) => `CO ${plural(n, 'st')}${ws ? ' purlwise' : ''}`,
	long: (ws, n) =>
		`Cast On ${plural(n, 'stitch', 'stitches')} ${ws ? 'purlwise' : 'knitwise'}`,
};

export const BIND_OFF: Cell = {
	chains: true,
	in: 1,
	out: [0, 0],
	str: (ws, n) => `BO ${plural(n, 'st')}${ws ? ' purlwise' : ''}`,
	long: (ws, n) =>
		`Bind Off ${plural(n, 'stitch', 'stitches')} ${ws ? 'purlwise' : 'knitwise'}`,
};

export const KNIT: Cell = {
	chains: true,
	in: 1,
	out: [0, 1],
	str: (ws, n) => (ws ? 'p' : 'k') + displayInt.format(n),
	long: (ws, n) => (ws ? 'Purl ' : 'Knit ') + plural(n, 'stitch', 'stitches'),
};

export const PURL: Cell = {
	chains: true,
	in: 1,
	out: [0, 1],
	str: (ws, n) => (ws ? 'k' : 'p') + displayInt.format(n),
	long: (ws, n) => (ws ? 'Knit ' : 'Purl ') + plural(n, 'stitch', 'stitches'),
};

export const PLACE_MARKER: Cell = {
	chains: false,
	in: 0,
	out: [0, 0],
	str: () => 'PM',
	long: () => 'Place Marker',
};

export const MAKE_ONE_LEFT: Cell = {
	chains: false,
	in: 1,
	out: [-1, 1],
	str: (ws) => (ws ? 'M1Lp' : 'M1L'),
	long: (ws) => (ws ? 'Make 1 Left purlwise' : 'Make 1 Left'),
};

export const MAKE_ONE_RIGHT: Cell = {
	chains: false,
	in: 1,
	out: [0, 2],
	str: (ws) => (ws ? 'M1Rp' : 'M1R'),
	long: (ws) => (ws ? 'Make 1 Right purlwise' : 'Make 1 Right'),
};

export const YARN_OVER: Cell = {
	chains: false,
	in: 0,
	out: [0, 1],
	str: () => 'YO',
	long: () => 'Yarn Over',
};

export const BACKWARDS_LOOP_CAST_ON: Cell = {
	chains: true,
	in: 0,
	out: [0, 1],
	str: (_ws, n) => `BCO ${plural(n, 'st')}`,
	long: (_ws, n) => `Backwards loop Cast On ${plural(n, 'stitch', 'stitches')}`,
};

export const CABLE_CAST_ON: Cell = {
	chains: true,
	in: 0,
	out: [0, 1],
	str: (_ws, n) => `CCO ${plural(n, 'st')}`,
	long: (_ws, n) => `Cable Cast On ${plural(n, 'stitch', 'stitches')}`,
};

export const KNIT_FRONT_BACK: Cell = {
	chains: false,
	in: 1,
	out: [1, 2],
	str: (ws) => (ws ? 'pfb' : 'kfb'),
	long: (ws) => (ws ? 'Purl Front and Back' : 'Knit Front and Back'),
};

export const KNIT_LEFT_LIFTED: Cell = {
	chains: false,
	in: 1,
	out: [-1, 1],
	str: (ws) => (ws ? 'pll' : 'kll'),
	long: (ws) => (ws ? 'Purl Left Lifted' : 'Knit Left Lifted'),
};

export const KNIT_RIGHT_LIFTED: Cell = {
	chains: false,
	in: 1,
	out: [0, 2],
	str: (ws) => (ws ? 'prl' : 'krl'),
	long: (ws) => (ws ? 'Purl Right Lifted' : 'Knit Right Lifted'),
};

const KNIT_PURL_INC: Cell[] = [];
export const knitPurlInc = (n: number) =>
	(KNIT_PURL_INC[n] ??= {
		chains: false,
		in: 1,
		out: [0, n],
		str: (ws) =>
			`(${cyclic(ws ? ['p1', 'k1'] : ['k1', 'p1'], n).join(', ')}) into next st`,
		long: (ws) =>
			`(${cyclic(ws ? ['Purl', 'Knit'] : ['Knit', 'Purl'], n).join(', ')}) all into next stitch`,
	});

const KNIT_YARN_OVER: Cell[] = [];
export const knitYarnOverInc = (n: number) =>
	n & 1
		? (KNIT_YARN_OVER[n] ??= {
				chains: false,
				in: 1,
				out: [0, n],
				str: (ws) =>
					`(${cyclic([ws ? 'p1' : 'k1', 'YO'], n).join(', ')}) into next st`,
				long: (ws) =>
					`(${cyclic([ws ? 'Purl' : 'Knit', 'Yarn Over'], n).join(', ')}) all into next stitch`,
			})
		: knitPurlInc(n); // cannot perform even increases; fall-back to knit-purl

const cyclic = (l: string[], n: number) => {
	const r = [];
	for (let i = 0; i < n; ++i) {
		r.push(l[i % l.length]!);
	}
	return r;
};

const KNIT_TOGETHER: Cell[] = [];
export const knitTogether = (n: number) =>
	(KNIT_TOGETHER[n] ??= {
		chains: false,
		in: n,
		out: [(n / 2) | 0, ((n / 2) | 0) + 1],
		str: (ws) => (ws ? `p${n}tog` : `k${n}tog`),
		long: (ws) =>
			ws
				? `Purl ${displayInt.format(n)} together`
				: `Knit ${displayInt.format(n)} together`,
	});

const SLIP_KNIT: Cell[] = [];
export const slipKnit = (n: number) =>
	(SLIP_KNIT[n] ??= {
		chains: false,
		in: n,
		out: [(n / 2) | 0, ((n / 2) | 0) + 1],
		str: (ws) => `${'s'.repeat(n)}${ws ? 'p' : 'k'}`,
		long: (ws) =>
			`Slip ${displayInt.format(n)} then ${ws ? 'Purl' : 'Knit'} all`,
	});

const displayInt = new Intl.NumberFormat(undefined, {
	maximumFractionDigits: 0,
	useGrouping: false,
});

export const plural = (
	v: number,
	singular: string,
	plural = singular + 's',
) => {
	const i = Math.round(v);
	return i === 1
		? `${displayInt.format(i)} ${singular}`
		: `${displayInt.format(i)} ${plural}`;
};

export function findRepetitions(cells: Cell[]): Block[] {
	const n = cells.length;
	if (n < 2) {
		return [{ cells, repetitions: 1 }];
	}
	// Find all available repetitions in the input and score them
	// by how much they will reduce the size of the instructions.
	// This is not a very efficient search, but we do not expect
	// n to be beyond the thousands anyway.
	const options: { i: number; l: number; r: number; s: number }[] = [];
	const skip = new Set<number>();
	for (let i = 0; i < n - 1; ++i) {
		for (let l = 1; i + l * 2 <= n; ++l) {
			if (skip.has(l * n + i)) {
				continue;
			}

			let r = 1;
			rep: for (; i + (r + 1) * l <= n; ++r) {
				for (let j = 0; j < l; ++j) {
					if (cells[i + r * l + j] !== cells[i + j]) {
						break rep;
					}
				}
				for (let p = 0; p <= r; ++p) {
					skip.add(l * (r + 1 - p) * n + i + l * p);
				}
			}
			if (r > 1) {
				let runningType: Cell | null = null;
				let shorthandLength = 0;
				for (let j = 0; j < l; ++j) {
					const cell = cells[i + j]!;
					if (cell !== runningType) {
						if (runningType) {
							++shorthandLength;
							runningType = null;
						}
						if (cell.chains) {
							runningType = cell;
						} else {
							++shorthandLength;
						}
					}
				}
				if (runningType && cells[i] !== runningType) {
					++shorthandLength;
				}
				let score = shorthandLength * (r - 1);
				if (i && cells[i]!.chains && cells[i - 1] === cells[i]) {
					--score; // introducing this block breaks a run, so lower the score
				}
				if (score > 0) {
					options.push({
						i,
						l,
						r,
						s:
							score +
							(cells[i] !== cells[i + l - 1] || !cells[i]?.chains ? 0.5 : 0) + // apply bonus to runs which have something interesting at the start or end
							(i === 0 || i + l * r === n ? 0.25 : 0), // apply bonus to runs which touch sides
					});
				}
			}
		}
	}

	// pick runs greedily
	options.sort((a, b) => b.s - a.s);
	const choices: { i: number; l: number; r: number }[] = [];
	while (options.length > 0) {
		const choice = options[0]!;
		choices.push(choice);

		// remove overlapping runs
		const end = choice.i + choice.l * choice.r;
		let del = 0;
		for (let i = 0; i < options.length; ++i) {
			const o = options[i]!;
			const oEnd = o.i + o.l * o.r;
			if (o.i < end && choice.i < oEnd) {
				++del;
			} else {
				if (o.i === end || choice.i === oEnd) {
					o.s += 0.0625; // apply bonus to runs which touch existing runs
				}
				options[i - del] = o;
			}
		}
		options.length -= del;
	}

	let p = 0;
	const result: Block[] = [];
	for (const choice of choices.sort((a, b) => a.i - b.i)) {
		if (choice.i > p) {
			result.push({ cells: cells.slice(p, choice.i), repetitions: 1 });
		}
		p = choice.i + choice.l * choice.r;
		result.push({
			cells: cells.slice(choice.i, choice.i + choice.l),
			repetitions: choice.r,
		});
	}
	if (p < cells.length) {
		result.push({ cells: cells.slice(p), repetitions: 1 });
	}
	return result;
}
