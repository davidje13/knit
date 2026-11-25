export const INTERPOLATION = new Map<
	string,
	(begin: number, end: number) => (f: number) => number
>([
	['linear', (begin, end) => (f) => begin + (end - begin) * f],
	[
		'sine',
		(begin, end) => {
			// TODO: this assumes the input max stitch count corresponds to 4* the length of the input row count, but this is not enforced by the UI and will be gauge dependent
			const rad2pi = Math.max(begin, end);
			const a1 = Math.acos(begin / rad2pi);
			const a2 = Math.acos(end / rad2pi);
			return (f) => Math.cos(a1 + (a2 - a1) * f) * rad2pi;
		},
	],
]);
