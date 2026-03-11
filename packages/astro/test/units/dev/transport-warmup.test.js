import * as assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { describe, it } from 'node:test';
import { createVite } from '../../../dist/core/create-vite.js';
import { RunnablePipeline } from '../../../dist/vite-plugin-app/pipeline.js';
import { createDevelopmentManifest } from '../../../dist/vite-plugin-astro-server/plugin.js';
import { createBasicSettings, createFixture, defaultLogger } from '../test-utils.js';

/**
 * Minimal RouteData object for use in routesList mocks.
 * Provides the fields required by serializeRouteData() inside createVite().
 * @param {string} component
 */
function makeRoute(component) {
	return { component, pattern: /.*/, fallbackRoutes: [], type: 'page', params: [], segments: [], prerender: false, isIndex: false, origin: 'project', route: '/' + component };
}

/**
 * Minimal ModuleLoader mock for unit tests.
 * @param {(src: string) => Promise<Record<string, any>>} importFn
 */
function makeMockLoader(importFn) {
	return {
		import: importFn,
		fixStacktrace: () => {},
		resolveId: async () => undefined,
		getModuleById: () => undefined,
		getModulesByFile: () => undefined,
		getModuleInfo: () => null,
		eachModule: () => {},
		invalidateModule: () => {},
		clientReload: () => {},
		webSocketSend: () => {},
		isHttps: () => false,
		events: new EventEmitter(),
		getSSREnvironment: () => ({}),
	};
}

describe('createVite server.warmup config', () => {
	it('includes real file component paths in ssrFiles when command is dev', async () => {
		const fixture = await createFixture({});
		const settings = await createBasicSettings({ root: fixture.path });
		const routesList = {
			routes: [makeRoute('src/pages/index.astro'), makeRoute('src/pages/about.astro')],
		};

		const config = await createVite(
			{},
			{
				settings,
				logger: defaultLogger,
				mode: 'development',
				command: 'dev',
				routesList,
				sync: false,
			},
		);

		assert.ok(Array.isArray(config.server?.warmup?.ssrFiles), 'ssrFiles should be an array');
		assert.ok(
			config.server.warmup.ssrFiles.includes('src/pages/index.astro'),
			'should include index.astro',
		);
		assert.ok(
			config.server.warmup.ssrFiles.includes('src/pages/about.astro'),
			'should include about.astro',
		);
	});

	it('excludes \\0-prefixed virtual module IDs from ssrFiles', async () => {
		const fixture = await createFixture({});
		const settings = await createBasicSettings({ root: fixture.path });
		const routesList = {
			routes: [
				makeRoute('src/pages/index.astro'),
				makeRoute('\0virtual:astro-internal'),
			],
		};

		const config = await createVite(
			{},
			{
				settings,
				logger: defaultLogger,
				mode: 'development',
				command: 'dev',
				routesList,
				sync: false,
			},
		);

		assert.ok(
			!config.server.warmup.ssrFiles.includes('\0virtual:astro-internal'),
			'should exclude \\0-prefixed virtual modules',
		);
		assert.ok(
			config.server.warmup.ssrFiles.includes('src/pages/index.astro'),
			'should still include real file paths',
		);
	});

	it('excludes protocol-based virtual module IDs from ssrFiles', async () => {
		const fixture = await createFixture({});
		const settings = await createBasicSettings({ root: fixture.path });
		const routesList = {
			routes: [
				makeRoute('src/pages/index.astro'),
				makeRoute('astro:middleware'),
				makeRoute('virtual:astro-config'),
			],
		};

		const config = await createVite(
			{},
			{
				settings,
				logger: defaultLogger,
				mode: 'development',
				command: 'dev',
				routesList,
				sync: false,
			},
		);

		assert.ok(
			!config.server.warmup.ssrFiles.includes('astro:middleware'),
			'should exclude astro: protocol IDs',
		);
		assert.ok(
			!config.server.warmup.ssrFiles.includes('virtual:astro-config'),
			'should exclude virtual: protocol IDs',
		);
		assert.ok(
			config.server.warmup.ssrFiles.includes('src/pages/index.astro'),
			'should still include real file paths',
		);
	});

	it('does not add warmup config when command is build', async () => {
		const fixture = await createFixture({});
		const settings = await createBasicSettings({ root: fixture.path });
		const routesList = {
			routes: [makeRoute('src/pages/index.astro')],
		};

		const config = await createVite(
			{},
			{
				settings,
				logger: defaultLogger,
				mode: 'production',
				command: 'build',
				routesList,
				sync: false,
			},
		);

		assert.equal(config.server?.warmup, undefined, 'warmup should be undefined for build command');
	});
});

describe('RunnablePipeline transport timeout error augmentation', () => {
	it('adds Docker/WSL guidance when loader throws transport invoke timed out', async () => {
		const fixture = await createFixture({
			'/src/pages/index.astro': '<h1>Test</h1>',
		});
		const settings = await createBasicSettings({ root: fixture.path });
		const manifest = await createDevelopmentManifest(settings);
		const routesList = { routes: [] };

		const mockLoader = makeMockLoader(async () => {
			throw new Error('transport invoke timed out after 60000ms');
		});

		const pipeline = RunnablePipeline.create(routesList, {
			loader: mockLoader,
			logger: defaultLogger,
			manifest,
			settings,
		});

		const filePath = new URL('src/pages/index.astro', settings.config.root);
		// Minimal RouteData — only fields accessed in preload() before loader.import()
		const routeData = { type: 'page', component: 'src/pages/index.astro' };

		await assert.rejects(
			() => pipeline.preload(routeData, filePath),
			(err) => {
				assert.ok(
					err.message.includes('Docker') || err.message.includes('WSL'),
					`Expected error to mention Docker or WSL, got:\n${err.message}`,
				);
				assert.ok(
					err.message.includes('usePolling'),
					`Expected error to mention usePolling, got:\n${err.message}`,
				);
				return true;
			},
		);
	});
});
