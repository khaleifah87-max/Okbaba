/**
 * Transforms dynamic `import(<specifier>)` expressions into
 * `Promise.resolve().then(() => require(<specifier>))`.
 *
 * Hermes (used in Expo/React Native Android release builds) may fail to
 * parse some `import()` usages coming from certain dependencies.
 */

module.exports = function dynamicImportToRequirePlugin({ types: t }) {
  return {
    name: "dynamic-import-to-require",
    visitor: {
      CallExpression(path) {
        // Babel represents `import()` as a CallExpression whose callee is `Import`.
        if (!path.get("callee").isImport()) return;

        const args = path.get("arguments");
        if (!args || args.length === 0) return;

        // `require()` expects a single argument.
        const importSpecifier = t.cloneNode(args[0].node);

        // Promise.resolve().then(() => require(specifier))
        const requireCall = t.callExpression(t.identifier("require"), [
          importSpecifier,
        ]);

        const arrowFn = t.arrowFunctionExpression([], requireCall);

        const promiseResolve = t.callExpression(
          t.memberExpression(t.identifier("Promise"), t.identifier("resolve")),
          [],
        );

        const thenCall = t.callExpression(
          t.memberExpression(promiseResolve, t.identifier("then")),
          [arrowFn],
        );

        path.replaceWith(thenCall);
      },
    },
  };
};