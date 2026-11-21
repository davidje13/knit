import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';

const basedir = dirname(fileURLToPath(import.meta.url));

const paths = [['pattern'], ['stitches']];

export default paths.map((p) => ({
	input: join(basedir, 'web', 'script', ...p, 'index.mts'),
	output: {
		file: join(basedir, 'build', 'static', ...p, 'index.mjs'),
		format: 'esm',
	},
	plugins: [
		nodeResolve(),
		typescript({
			compilerOptions: {
				noEmit: false,
				rewriteRelativeImportExtensions: true,
				rootDir: '.',
				outDir: join('build', 'static'),
			},
			include: ['web/**'],
			exclude: ['**/*.test.*'],
			tslib: {},
		}),
		terser(),
	],
}));
