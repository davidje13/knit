/**
 * @template {any[]} Args
 * @param {(...args: Args) => void} fn
 * @param {number} delay
 * @return {((...args: Args) => void) & { cancel: () => void; immediate: () => void }}
 */
export const debounce = (fn, delay) => {
	/** @type {ReturnType<typeof setTimeout> | null} */ let tm = null;
	/** @type {(() => void) | null} */ let run = null;
	/** @param {Args} args */
	const wrapped = (...args) => {
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
				run();
			}
		},
	});
};
