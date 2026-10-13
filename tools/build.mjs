// Build: inline every <script src> from index.html into single-file outputs.
//   node tools/build.mjs
// Produces:
//   dist/the-linear-maze.html  standalone page (open it or host it anywhere)
//   dist/artifact.html         the same page without the <html>/<head>/<body>
//                              wrapper, for publishing as a claude.ai Artifact
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(root, 'index.html'), 'utf8');

const inlined = src.replace(/<script src="([^"]+)"><\/script>/g, (_, file) => {
  const code = readFileSync(join(root, file), 'utf8');
  if (code.includes('</script')) throw new Error(file + ' contains "</script" and cannot be inlined');
  return '<script>/* ' + file + ' */\n' + code + '\n</script>';
});

mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist/the-linear-maze.html'), inlined);

const artifact = inlined
  .replace(/^[\s\S]*?<title>/, '<title>')
  .replace('</head>\n<body>\n', '\n')
  .replace(/<\/body>\s*<\/html>\s*$/, '');
writeFileSync(join(root, 'dist/artifact.html'), artifact);

const kb = (s) => (Buffer.byteLength(s) / 1024).toFixed(0) + ' KB';
console.log('dist/the-linear-maze.html', kb(inlined));
console.log('dist/artifact.html', kb(artifact));
