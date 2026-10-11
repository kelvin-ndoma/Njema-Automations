import { readFile, writeFile } from 'node:fs/promises';
// Temporary, narrowly scoped workaround for React issue #37561.
// Never change rendering, redirects, error reporting, or the development indicator.
const file = new URL(
  '../node_modules/next/dist/compiled/react-server-dom-webpack/cjs/react-server-dom-webpack-client.browser.development.js',
  import.meta.url,
);
let source = await readFile(file, 'utf8');
for (const suffix of [1, 3]) {
  const marker = `childrenEndTime$jscomp$${suffix}`;
  const guarded = `if (supportsUserTiming && 0 <= ${marker}) {`;
  if (source.includes(guarded)) continue;
  const pattern = new RegExp(
    `(${marker.replaceAll('$', '\\$')} = [^;]+;[\\s\\S]{0,1200}?)if \\(supportsUserTiming\\) \\{`,
  );
  const matches = [...source.matchAll(new RegExp(pattern.source, 'g'))];
  if (matches.length !== 1)
    throw new Error(
      'Next development instrumentation changed; review and remove/update the temporary workaround.',
    );
  source = source.replace(pattern, (_match, prefix) => prefix + guarded);
}
await writeFile(file, source);
console.log('Verified development performance guards for aborted/errored Server Components.');
