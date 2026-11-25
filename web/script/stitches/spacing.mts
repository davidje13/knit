import { KNIT, type Cell } from './cells.mts';
import type { IncDec } from './methods.mts';

type SpacingFn = (
	maxChange: number,
) => (
	prev: number,
	next: number,
	method: IncDec,
	reverse: boolean,
	rowNumber: number,
	looped: boolean,
) => Cell[];

export const spacingPos = (pos: number): SpacingFn => {
	const rightAlign = pos > 0.5;

	return (maxChange) => {
		let previousRow = Number.NEGATIVE_INFINITY;

		return (prev, next, method, reverse, rowNumber, looped) => {
			if (next !== prev && method.rowClearance) {
				if (rowNumber < previousRow + method.rowClearance) {
					throw new Error(
						`${method.cell(2, false).str(reverse, 1)} requires a minimum row clearance of ${method.rowClearance} rows`,
					);
				}
				previousRow = rowNumber;
			}

			const noInitial =
				!looped && Boolean(reverse ? method.noEnd : method.noBegin);
			const noFinal = Boolean(reverse ? method.noBegin : method.noEnd);
			const methodLower = next > prev ? method.from : method.to;
			const methodUpper = next > prev ? method.to : method.from;
			let lower = next > prev ? prev : next;
			let upper = next > prev ? next : prev;

			const r: Cell[] = [];
			let run = 0;
			while (upper !== lower) {
				if (lower < methodLower) {
					throw new Error(
						`not enough stitches for ${method.cell(2, false).str(reverse, 1)}`,
					);
				}
				const diff = Math.min(
					upper - lower,
					methodUpper - methodLower,
					maxChange,
				);
				if (diff < 1) {
					throw new Error(
						`unable to apply ${method.cell(2, false).str(reverse, 1)}`,
					);
				}
				r.push(method.cell(methodLower + diff, rightAlign));
				lower -= methodLower;
				upper -= methodLower + diff;
				if (!methodLower) {
					++run;
				}
				if (upper !== lower && (method.noAdjacent || run >= maxChange)) {
					r.push(KNIT);
					--upper;
					--lower;
					run = 0;
				}
			}
			if (rightAlign) {
				r.reverse();
			}
			if (lower < (noInitial ? 1 : 0) + (noFinal ? 1 : 0)) {
				throw new Error(
					`${r[0]!.str(reverse, 1)} cannot be applied at the edge`,
				);
			}
			if (!lower) {
				return r;
			}
			let indent = Math.round(lower * pos);
			if (!indent && noInitial) {
				++indent;
			} else if (indent === lower && noFinal) {
				--indent;
			} else {
				// prefer not increasing at edges if possible
				if (!indent && (lower >= 2 || (lower === 1 && !rightAlign))) {
					++indent;
				} else if (
					indent === lower &&
					(lower >= 2 || (lower === 1 && rightAlign))
				) {
					--indent;
				}
			}
			const fullRow: Cell[] = [];
			for (let i = 0; i < indent; ++i) {
				fullRow.push(KNIT);
			}
			for (const c of r) {
				fullRow.push(c);
			}
			for (let i = indent; i < lower; ++i) {
				fullRow.push(KNIT);
			}
			return fullRow;
		};
	};
};

export const SPACING = new Map<string, SpacingFn>([
	[
		'uniform',
		(maxChange) => {
			let previousRow = Number.NEGATIVE_INFINITY;
			const errorProp: { s: number; p: number }[][] = [];

			return (prev, next, method, reverse, rowNumber, looped) => {
				if (next !== prev && method.rowClearance) {
					if (rowNumber < previousRow + method.rowClearance) {
						throw new Error(
							`${method.cell(2, false).str(reverse, 1)} requires a minimum row clearance of ${method.rowClearance} rows`,
						);
					}
					previousRow = rowNumber;
				}

				const noInitial =
					!looped && Boolean(reverse ? method.noEnd : method.noBegin);
				const noFinal = Boolean(reverse ? method.noBegin : method.noEnd);
				const methodLower = next > prev ? method.from : method.to;
				let methodUpper = next > prev ? method.to : method.from;
				const lower = next > prev ? prev : next;
				const upper = next > prev ? next : prev;
				const diff = upper - lower;

				let available = lower - (noInitial ? 1 : 0) - (noFinal ? 1 : 0);
				let cost = methodLower;
				if (!cost) {
					// to avoid special casing later, pretend things like m1 take a stitch as input
					cost = 1;
					++methodUpper;
					if (noInitial || noFinal) {
						++available; // this restriction is handled by pretending it takes a stitch as input
					}
				} else if (method.noAdjacent) {
					++cost;
					++available;
				}

				const maxN = Math.ceil(diff / ((available / cost) | 0)) + 1;
				if (maxN > methodUpper || maxN > maxChange) {
					throw new Error(
						`not enough stitches for ${method.cell(2, false).str(reverse, 1)}`,
					);
				}
				let actions: number[] = [];
				const f = diff / lower;
				for (let i = 0; i < lower; ++i) {
					actions.push((((i + 1) * f + 0.5) | 0) - ((i * f + 0.5) | 0));
				}

				if (!methodLower) {
					// undo pretending m1 takes a stitch as input
					actions = actions.flatMap((v) => (v > 0 ? [0, v] : [0]));
				}

				let best = 0;
				let bestScore = Number.NEGATIVE_INFINITY;
				const n = actions.length;
				const costs: number[] = [];
				for (let i = 0; i < n; ++i) {
					const p = (i + 0.5) / n;
					let cost = 0;
					for (const r of errorProp) {
						cost *= 0.8;
						for (const err of r) {
							cost += err.s / ((err.p - p) * (err.p - p) + 0.01);
						}
					}
					costs.push(cost);
				}
				for (let cycle = 0; cycle < n; ++cycle) {
					let initialKnit = actions[cycle] === 0;
					if (noInitial && !initialKnit) {
						continue;
					}
					let finalKnit = actions[(cycle + n - 1) % n] === 0;
					if (noFinal && !finalKnit) {
						continue;
					}
					let score = (initialKnit ? 1000 : 0) + (finalKnit ? 1000 : 0);
					for (let i = 0; i < n; ++i) {
						const v = actions[(cycle + i) % n];
						if (v) {
							score -= costs[i]! * v;
						}
					}
					if (score > bestScore) {
						best = cycle;
						bestScore = score;
					}
				}

				const cells: Cell[] = [];
				const err: { s: number; p: number }[] = [];
				for (let i = 0; i < n; ++i) {
					const v = actions[(best + i) % n]!;
					if (v === 0) {
						cells.push(KNIT);
					} else {
						err.push({ s: v, p: (i + 0.5) / n });
						cells.push(method.cell(v + 1, false));
					}
				}
				if (errorProp.length >= 5) {
					errorProp.shift();
				}
				errorProp.push(err);
				return cells;
			};
		},
	],
	//['column', () => () => []], TODO: should probably request number of columns from UI, split document into this many columns and try to make row sizes a consistent multiple of the number of columns, then use "down the centre" spacing for each column.
	[
		'sides',
		(maxChange) => {
			const l = spacingPos(0)(maxChange);
			const r = spacingPos(1)(maxChange);
			return (prev, next, method, reverse, rowNumber, looped) => {
				try {
					const lSide = l(
						prev >>> 1,
						next >>> 1,
						method,
						reverse,
						rowNumber,
						looped || reverse,
					);
					const rSide = r(
						(prev + 1) >>> 1,
						(next + 1) >>> 1,
						method,
						reverse,
						rowNumber,
						looped || !reverse,
					);
					if (
						!method.noAdjacent ||
						lSide.at(-1) === KNIT ||
						rSide[0] === KNIT
					) {
						const combined = [...lSide, ...rSide];
						if (
							combined[0] !== KNIT &&
							combined.at(-1) === KNIT &&
							combined.at(-2) === KNIT
						) {
							combined.unshift(combined.pop()!);
						}
						return combined;
					}
				} catch {}
				return l(prev, next, method, reverse, rowNumber, looped);
			};
		},
	],
]);
