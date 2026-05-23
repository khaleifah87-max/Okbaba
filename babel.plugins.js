module.exports = function (api) {
  return [
    // Fix 1: Transform dynamic import() expressions to require() for Hermes compatibility.
    // @supabase/supabase-js v2.x uses import(/* webpackIgnore */ '@opentelemetry/api') in its
    // CJS bundle, which Hermes (Android release builds) cannot parse.
    require("./babel.dynamic-import-to-require"),

    // Fix 2: Redirect Node.js built-ins that ws (used by @supabase/realtime-js) pulls in.
    // Metro does not stub Node.js core modules, so we provide minimal shims.
    // 'ws' itself is redirected to its browser stub (throws on use, which is fine since
    // React Native has a native WebSocket and realtime-js uses it automatically).
    [
      "module-resolver",
      {
        alias: {
          // Stub out the Node.js 'stream' module required by ws/lib/stream.js
          "^stream$": "./shims/stream",
          // Point 'ws' to its own browser stub to prevent all ws/* imports
          "^ws$": "./node_modules/ws/browser.js",
        },
      },
      "native-shims-resolver",
    ],
  ];
};