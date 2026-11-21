export const debounce = <Args extends any[]>(
	fn: (...args: Args) => void,
	delay: number,
): ((...args: Args) => void) & {
	cancel: () => void;
	immediate: () => void;
} => {
	let tm: ReturnType<typeof setTimeout> | null = null;
	let run: (() => void) | null = null;
	const wrapped = (...args: Args) => {
		if (tm) {
			clearTimeout(tm);
		}
		run = () => {
			tm = null;
			run = null;
			fn(...args);
		};
		tm = setTimeout(run, delay);
	};
	return Object.assign(wrapped, {
		cancel() {
			if (tm) {
				clearTimeout(tm);
				tm = null;
			}
		},
		immediate() {
			if (tm) {
				clearTimeout(tm);
				run?.();
			}
		},
	});
};
