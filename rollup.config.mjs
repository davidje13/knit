import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

const basedir = dirname(fileURLToPath(import.meta.url));

const paths = [
	['pattern', 'index.mjs'],
	['stitches', 'index.mjs'],
];

export default paths.map((p) => ({
	input: join(basedir, 'web', 'script', ...p),
	output: {
		file: join(basedir, 'build', 'static', ...p),
		format: 'esm',
	},
	plugins: [nodeResolve(), terser()],
}));
