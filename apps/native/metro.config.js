// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");
const { FileStore } = require("metro-cache");
const { withNativeWind } = require("nativewind/metro");
const path = require("node:path");

const projectRoot  = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = withTurborepoManagedCache(
	withNativeWind(getDefaultConfig(projectRoot), {
		input: "./global.css",
		configPath: "./tailwind.config.js",
	}),
);

// Bun's isolated linker places real package files under
// <monorepoRoot>/node_modules/.bun/ and creates symlinks from each
// workspace's node_modules.  Metro only watches files inside `projectRoot`
// by default, so it can't follow those symlinks.  Adding the monorepo root
// to watchFolders makes all symlink targets reachable.
config.watchFolders = [monorepoRoot];

// Also tell the resolver to search the monorepo-level node_modules so that
// packages shared across workspaces are always found.
config.resolver.nodeModulesPaths = [
	path.resolve(projectRoot, "node_modules"),
	path.resolve(monorepoRoot, "node_modules"),
];

config.resolver.unstable_enablePackageExports = true;

module.exports = config;

/**
 * Move the Metro cache to the `.cache/metro` folder.
 * If you have any environment variables, you can configure Turborepo to invalidate it when needed.
 *
 * @see https://turbo.build/repo/docs/reference/configuration#env
 * @param {import('expo/metro-config').MetroConfig} config
 * @returns {import('expo/metro-config').MetroConfig}
 */
function withTurborepoManagedCache(config) {
	config.cacheStores = [
		new FileStore({ root: path.join(__dirname, ".cache/metro") }),
	];
	return config;
}
