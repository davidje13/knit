import { el } from '../dom.mts';
import { plural, type Block, type Cell } from './cells.mts';

export function toInstruction(
	cell: Cell,
	count: number,
	wrongSide: boolean,
): (HTMLElement | string)[] {
	return [
		el('abbr', { title: cell.long(wrongSide, count) }, [
			cell.str(wrongSide, count),
		]),
	];
}

export function toInstructions(
	parts: Block[],
	wrongSide: boolean,
): (HTMLElement | string)[] {
	if (wrongSide) {
		parts = [...parts]
			.reverse()
			.map((v) => ({ ...v, cells: [...v.cells].reverse() }));
	}
	const steps: (HTMLElement | string)[] = [];
	for (const part of parts) {
		let subSteps: (HTMLElement | string)[] = [];
		let runningType: Cell | null = null;
		let runningCount = 0;
		for (const cell of part.cells) {
			if (cell === runningType) {
				++runningCount;
			} else {
				if (runningType) {
					subSteps.push(...toInstruction(runningType, runningCount, wrongSide));
					runningType = null;
				}
				if (cell.chains) {
					runningType = cell;
					runningCount = 1;
				} else {
					subSteps.push(...toInstruction(cell, 1, wrongSide));
				}
			}
		}
		if (runningType) {
			subSteps.push(...toInstruction(runningType, runningCount, wrongSide));
		}

		if (part.repetitions !== 1) {
			if (steps.length) {
				steps.push(', ');
			}
			steps.push('(');
			for (let i = 0; i < subSteps.length; ++i) {
				if (i) {
					steps.push(', ');
				}
				steps.push(subSteps[i]!);
			}
			steps.push(
				')',
				el('abbr', { title: `repeat ${plural(part.repetitions, 'time')}` }, [
					`\u00D7${part.repetitions}`,
				]),
			);
		} else {
			for (const step of subSteps) {
				if (steps.length) {
					steps.push(', ');
				}
				steps.push(step);
			}
		}
	}
	return steps;
}
