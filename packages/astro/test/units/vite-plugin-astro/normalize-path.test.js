import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { pathToFileURL } from 'node:url';
import { normalizePath } from 'vite';
import { normalizeFilename } from '../../../dist/vite-plugin-utils/index.js';

const root = pathToFileURL('/D:/dev/project/');

describe('normalizePath(normalizeFilename(...))', () => {
	it('produces the same key whether the input has /@fs/ prefix or not', () => {
		const withPrefix = '/@fs/D:/dev/project/src/pages/index.astro';
		const withoutPrefix = 'D:/dev/project/src/pages/index.astro';

		const keyWithPrefix = normalizePath(normalizeFilename(withPrefix, root));
		const keyWithoutPrefix = normalizePath(normalizeFilename(withoutPrefix, root));

		assert.equal(keyWithPrefix, keyWithoutPrefix);
	});

	it('strips the /@fs/ prefix and returns a normalized path', () => {
		const withPrefix = '/@fs/D:/dev/project/src/pages/index.astro';
		const key = normalizePath(normalizeFilename(withPrefix, root));

		assert.ok(!key.startsWith('/@fs/'), 'key should not start with /@fs/');
		assert.ok(key.includes('D:/dev/project/src/pages/index.astro'), 'key should contain the real path');
	});

	it('handles paths without the /@fs/ prefix unchanged', () => {
		const withoutPrefix = '/D:/dev/project/src/pages/index.astro';
		const key = normalizePath(normalizeFilename(withoutPrefix, root));

		assert.ok(!key.startsWith('/@fs/'), 'key should not start with /@fs/');
	});
});
