import assert from 'node:assert';
import * as path from 'node:path';
import { before, describe, it } from 'node:test';
import { Range } from '@volar/language-server';
import { getLanguageServer, type LanguageServer } from '../server.ts';
import { fixtureDir } from '../utils.ts';

describe('Formatting - Prettier', () => {
	let languageServer: LanguageServer;

	before(async () => (languageServer = await getLanguageServer()));

	it('Can format document', async () => {
		const document = await languageServer.openFakeDocument(`---\n\n\n---`, 'astro');
		const formatEdits = await languageServer.handle.sendDocumentFormattingRequest(document.uri, {
			tabSize: 2,
			insertSpaces: true,
		});

		assert.deepStrictEqual(formatEdits, [
			{
				range: Range.create(0, 0, 3, 3),
				newText: '---\n\n---\n',
			},
		]);
	});

	it('Can ignore documents correctly', async () => {
		const document = await languageServer.handle.openTextDocument(
			path.join(fixtureDir, 'dontFormat.astro'),
			'astro',
		);
		const formatEdits = await languageServer.handle.sendDocumentFormattingRequest(document.uri, {
			tabSize: 2,
			insertSpaces: true,
		});

		assert.deepStrictEqual(formatEdits, null);
	});

	it('Respect .editorconfig', async () => {
		const document = await languageServer.handle.openTextDocument(
			path.join(fixtureDir, 'editorConfig.astro'),
			'astro',
		);
		const formatEdits = await languageServer.handle.sendDocumentFormattingRequest(document.uri, {
			tabSize: 2,
			insertSpaces: true,
		});

		assert.deepStrictEqual(formatEdits, [
			{
				range: Range.create(0, 0, 3, 0),
				newText: '<div>\r\n\t<div></div>\r\n</div>\r\n',
			},
		]);
	});

	it('Preserves trailing commas in frontmatter multi-line function calls', async () => {
		const document = await languageServer.handle.openTextDocument(
			path.join(fixtureDir, 'trailingComma.astro'),
			'astro',
		);
		const formatEdits = await languageServer.handle.sendDocumentFormattingRequest(document.uri, {
			tabSize: 2,
			insertSpaces: true,
		});

		assert.ok(formatEdits && formatEdits.length > 0, 'Expected formatting edits to be returned');
		const formattedText = formatEdits![0].newText;
		// Regression test: version 2.8.1 was removing trailing commas in frontmatter.
		// After formatting, the multi-line function call should have a trailing comma
		// before the closing parenthesis.
		assert.match(
			formattedText,
			/,\r?\n\)/,
			'Expected formatted output to contain a trailing comma in the multi-line function call',
		);
	});
});
