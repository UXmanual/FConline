const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const monorepoRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

config.watchFolders = [monorepoRoot]

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
]
config.resolver.disableHierarchicalLookup = true

// 모바일은 Expo SDK가 기대하는 로컬 React 버전을 우선 사용한다.
config.resolver.extraNodeModules = {
  react: path.resolve(projectRoot, 'node_modules/react'),
  'react/jsx-runtime': path.resolve(projectRoot, 'node_modules/react/jsx-runtime.js'),
  'react/jsx-dev-runtime': path.resolve(projectRoot, 'node_modules/react/jsx-dev-runtime.js'),
  'react/compiler-runtime': path.resolve(projectRoot, 'node_modules/react/compiler-runtime.js'),
  'react-dom': path.resolve(projectRoot, 'node_modules/react-dom'),
  'react-dom/client': path.resolve(projectRoot, 'node_modules/react-dom/client.js'),
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
  'react-test-renderer': path.resolve(projectRoot, 'node_modules/react-test-renderer'),
  scheduler: path.resolve(projectRoot, 'node_modules/scheduler'),
  semver: path.resolve(monorepoRoot, 'node_modules/react-native-reanimated/node_modules/semver'),
}

module.exports = config
