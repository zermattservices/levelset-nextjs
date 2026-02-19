// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// apps/mobile is excluded from the pnpm workspace (uses npm),
// so we need to tell Metro to also watch the shared packages directory.
const monorepoRoot = path.resolve(__dirname, "../..");

config.watchFolders = [
  path.resolve(monorepoRoot, "packages/design-tokens"),
];

// Make sure Metro can resolve modules from the monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

module.exports = config;
