const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

if (!config.resolver.sourceExts.includes("sql")) {
  config.resolver.sourceExts.push("sql");
}

module.exports = withNativeWind(config, {
  input: "./global.css",
});
