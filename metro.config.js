const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const existingBlockList = config.resolver.blockList
  ? Array.isArray(config.resolver.blockList)
    ? config.resolver.blockList
    : [config.resolver.blockList]
  : [];

// Chặn Metro nạp trùng bản React thứ 2 từ mobile/node_modules hoặc backend/node_modules
config.resolver.blockList = [
  ...existingBlockList,
  /[/\\]mobile[/\\]node_modules[/\\].*/,
  /[/\\]backend[/\\]node_modules[/\\].*/,
];

module.exports = config;
