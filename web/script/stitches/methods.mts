import {
	BACKWARDS_LOOP_CAST_ON,
	CABLE_CAST_ON,
	KNIT_FRONT_BACK,
	KNIT_LEFT_LIFTED,
	KNIT_RIGHT_LIFTED,
	knitPurlInc,
	knitTogether,
	knitYarnOverInc,
	MAKE_ONE_LEFT,
	MAKE_ONE_RIGHT,
	slipKnit,
	YARN_OVER,
	type Cell,
} from './cells.mts';

export interface IncDec {
	from: number;
	to: number;
	noBegin?: boolean;
	noEnd?: boolean;
	noAdjacent?: boolean;
	rowClearance?: number;
	cell(n: number, right: boolean): Cell;
}

export const INCREASE = new Map<string, IncDec>([
	[
		'm1',
		{
			from: 0,
			to: 1,
			noBegin: true,
			noEnd: true,
			noAdjacent: true,
			cell: (_n, right) => (right ? MAKE_ONE_RIGHT : MAKE_ONE_LEFT),
		},
	],
	[
		'yo',
		{
			from: 0,
			to: 1,
			noBegin: true,
			noEnd: true,
			noAdjacent: true,
			cell: () => YARN_OVER,
		},
	],
	[
		'bco',
		{
			from: 0,
			to: 1,
			noBegin: true,
			noEnd: true,
			cell: () => BACKWARDS_LOOP_CAST_ON,
		},
	],
	['cco', { from: 0, to: 1, noBegin: true, cell: () => CABLE_CAST_ON }],
	['kfb', { from: 1, to: 2, cell: () => KNIT_FRONT_BACK }],
	[
		'kll',
		{
			from: 1,
			to: 2,
			rowClearance: 2,
			cell: (_n, right) => (right ? KNIT_RIGHT_LIFTED : KNIT_LEFT_LIFTED),
		},
	],
	[
		'kp',
		{ from: 1, to: Number.POSITIVE_INFINITY, cell: (n) => knitPurlInc(n) },
	],
	[
		'kyok',
		{
			from: 1,
			to: Number.POSITIVE_INFINITY,
			cell: (n) => knitYarnOverInc(n),
		},
	],
]);

export const DECREASE = new Map<string, IncDec>([
	[
		'k2tog',
		{ from: Number.POSITIVE_INFINITY, to: 1, cell: (n) => knitTogether(n) },
	],
	['ssk', { from: Number.POSITIVE_INFINITY, to: 1, cell: (n) => slipKnit(n) }],
]);
