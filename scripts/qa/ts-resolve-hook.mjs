// Resolve hook for running the lessons' pure TypeScript modules under plain
// Node (--experimental-strip-types): Next/TS import siblings without an
// extension ('./locationCheckGeometry'), Node needs the '.ts'. Registered by
// scripts/qa/ts-resolve.mjs via --import.
export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context);
  } catch (err) {
    const relative = specifier.startsWith('./') || specifier.startsWith('../');
    if (relative && !/\.[cm]?[jt]sx?$/.test(specifier)) return next(`${specifier}.ts`, context);
    throw err;
  }
}
