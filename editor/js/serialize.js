/* Linear Maze Editor — js/serialize.js
 * Writes the editor's changes as readable JavaScript (packs/editor/edits.js and
 * sprites.js), and checks code typed into the editor before it is saved.
 */
'use strict';
(function () {
  const ED = window.ED;
  const S = (ED.ser = {});
  const IDENT = /^[A-Za-z_$][\w$]*$/;
  const RESERVED = new Set('break case catch class const continue debugger default delete do else export extends finally for function if import in instanceof new return super switch this throw try typeof var void while with yield let static enum await implements package protected interface private public null true false'.split(' '));

  /** A string literal that is safe inside an inlined <script> (the single-file build inlines packs). */
  const LS = String.fromCharCode(0x2028), PS = String.fromCharCode(0x2029);
  S.str = (s) => JSON.stringify(String(s)).replace(/<\/(script)/gi, '<\\/$1').split(LS).join('\\u2028').split(PS).join('\\u2029');
  S.key = (k) => (IDENT.test(k) && !RESERVED.has(k) ? k : S.str(k));

  /** Turn any function source (method shorthand, arrow, function) into an expression. */
  S.normalizeFn = function (src) {
    src = String(src).trim();
    const tries = [src, 'function ' + src, src.replace(/^(async\s+)?(\*\s*)?(?:[A-Za-z_$][\w$]*|'[^']*'|"[^"]*"|\[[^\]]*\])\s*\(/, (m, a, star) => (a || '') + 'function' + (star ? '* ' : ' ') + '(')];
    for (const t of tries) {
      try {
        new Function('return (' + t + '\n);');
        return t;
      } catch (e) {}
    }
    return src;
  };
  /** Syntax check. Returns null if fine, or the error message. */
  S.checkFn = function (src) {
    try {
      const f = new Function('return (' + src + '\n);')();
      if (typeof f !== 'function') return 'This should be a function, like function (g, e, t) { ... }';
      return null;
    } catch (e) {
      return e.message;
    }
  };

  const ind = (n) => '  '.repeat(n);
  function reindent(src, depth) {
    // keep the function's own relative indentation, re-based to the current depth
    const lines = String(src).split('\n');
    if (lines.length === 1) return src;
    const rest = lines.slice(1).filter((l) => l.trim());
    const minIndent = rest.length ? Math.min(...rest.map((l) => l.match(/^\s*/)[0].length)) : 0;
    const closing = lines[lines.length - 1].match(/^\s*/)[0].length;
    const baseIndent = Math.min(minIndent, closing);
    return [lines[0], ...lines.slice(1).map((l) => (l.trim() ? ind(depth) + l.slice(baseIndent) : ''))].join('\n');
  }
  /** Serialize a value as a JavaScript literal. Functions are written as their source. */
  S.js = function js(v, depth, key) {
    depth = depth || 0;
    if (v === undefined) return 'undefined';
    if (v === null) return 'null';
    if (typeof v === 'string') return S.str(v);
    if (typeof v === 'number') return Number.isFinite(v) ? String(Math.round(v * 1e6) / 1e6) : v > 0 ? 'Infinity' : v < 0 ? '-Infinity' : 'null';
    if (typeof v === 'boolean') return String(v);
    if (typeof v === 'function') return reindent(S.normalizeFn(ED.fnSource(v)), depth);
    if (Array.isArray(v)) {
      if (!v.length) return '[]';
      // maps are written one row per line
      if ((key === 'map' || key === 'objects') && v.every((x) => typeof x === 'string')) return '[\n' + v.map((r) => ind(depth + 1) + S.str(r)).join(',\n') + ',\n' + ind(depth) + ']';
      const parts = v.map((x) => js(x, depth + 1));
      const flat = '[' + parts.join(', ') + ']';
      if (flat.length + depth * 2 < 110 && !flat.includes('\n')) return flat;
      return '[\n' + parts.map((p) => ind(depth + 1) + p).join(',\n') + ',\n' + ind(depth) + ']';
    }
    if (typeof v === 'object') {
      const keys = Object.keys(v).filter((k) => v[k] !== undefined);
      if (!keys.length) return '{}';
      const parts = keys.map((k) => S.key(k) + ': ' + js(v[k], depth + 1, k));
      const flat = '{ ' + parts.join(', ') + ' }';
      if (flat.length + depth * 2 < 110 && !flat.includes('\n')) return flat;
      return '{\n' + parts.map((p) => ind(depth + 1) + p).join(',\n') + ',\n' + ind(depth) + '}';
    }
    return 'null';
  };

  /** A plain-language list of what an edit set changes, for the file header and the Changes page. */
  S.summary = function (E, nameOf) {
    const out = [];
    const nm = nameOf || ((k, id) => id);
    const KIND = { items: 'item', enemies: 'monster', levels: 'floor', environments: 'tile set', terrain: 'tile type', weapons: 'weapon', armor: 'armor', blessings: 'blessing', lootTables: 'loot table', npcs: 'person', projectiles: 'projectile', textures: 'painter' };
    for (const [kind, map] of Object.entries(E.add || {})) for (const [id, d] of Object.entries(map)) out.push('new ' + (KIND[kind] || kind) + ' ' + id + (d.$extends ? ' (a copy of ' + d.$extends + ')' : ''));
    for (const [kind, map] of Object.entries(E.patch || {})) for (const [id, p] of Object.entries(map)) out.push('changed ' + (KIND[kind] || kind) + ' ' + id + ': ' + Object.keys(p).join(', '));
    for (const [kind, ids] of Object.entries(E.remove || {})) for (const id of ids) out.push('removed ' + (KIND[kind] || kind) + ' ' + id);
    if (E.levelOrder) out.push('floor order: ' + E.levelOrder.join(', '));
    if (E.player) out.push('player: ' + Object.keys(E.player.base || {}).concat(Object.keys(E.player.start || {}).map((k) => 'start ' + k), Object.keys(E.player.ammoMax || {}).map((k) => 'max ' + k)).join(', '));
    for (const k of Object.keys(E.knobs || {})) out.push('setting ' + k);
    return out;
  };

  S.editsFile = function (E) {
    const lines = S.summary(E);
    const clean = Object.assign({ format: 1, savedAt: new Date().toISOString() }, E);
    for (const k of ['add', 'patch', 'remove', 'knobs']) if (clean[k] && !Object.keys(clean[k]).length) delete clean[k];
    return [
      '/* The Linear Maze — packs/editor/edits.js',
      ' * GENERATED by the Linear Maze Editor (editor/index.html). Saved ' + new Date().toLocaleString() + '.',
      ' * Edit it with the editor. Hand edits are kept as long as the file stays valid JavaScript',
      ' * that calls LM.editor.apply({...}) once. packs/editor/runtime.js explains the format.',
      ' *',
      lines.length ? lines.map((l) => ' *   ' + l.replace(/\*\//g, '* /')).join('\n') : ' *   (no changes)',
      ' */',
      "'use strict';",
      '(function () {',
      '  const LM = window.LM, U = LM.util, T = LM.TILE, G = LM.gfx, AI = LM.ai;',
      '  const h = (...a) => LM.ui.h(...a);',
      '  const { eyes, lunge, flame, has, flag, wallRot, rot, ROT } = LM.editor.helpers;',
      '  LM.editor.apply(' + S.js(clean, 1) + ');',
      '})();',
      '',
    ].join('\n');
  };

  S.spritesFile = function (sprites) {
    const ids = Object.keys(sprites).sort();
    return [
      '/* The Linear Maze — packs/editor/sprites.js',
      ' * GENERATED by the Linear Maze Editor: pictures imported for monsters, items and tile sets,',
      ' * stored as data URLs so the single-file build carries them too.',
      ' */',
      "'use strict';",
      '(function () {',
      '  const S = (window.LM.editor.sprites = window.LM.editor.sprites || {});',
      ...ids.map((id) => '  S[' + S.str(id) + '] = ' + S.str(sprites[id]) + ';'),
      '})();',
      '',
    ].join('\n');
  };

  // ------------------------------------------------------------ names a function uses but doesn't define
  const JS_GLOBALS = new Set(('Math Object Array JSON String Number Boolean Date Set Map WeakMap WeakSet Symbol Promise Error TypeError RangeError ' +
    'parseInt parseFloat isNaN isFinite Infinity NaN undefined window document console performance setTimeout clearTimeout setInterval ' +
    'clearInterval requestAnimationFrame Image Path2D CanvasGradient navigator localStorage globalThis arguments this Uint8Array Int16Array ' +
    'Int32Array Float32Array Float64Array Uint16Array Uint32Array RegExp Intl encodeURIComponent decodeURIComponent Reflect Proxy ' +
    'structuredClone queueMicrotask atob btoa BigInt').split(' '));
  /** Rough scan of identifiers used but not declared in a function's source. */
  S.freeNames = function (src, extra) {
    const known = new Set([...JS_GLOBALS, ...(extra || [])]);
    let code = String(src);
    code = code.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
    code = code.replace(/`(?:\\[\s\S]|\$\{[^}]*\}|[^`\\])*`/g, (m) => ' ' + (m.match(/\$\{([^}]*)\}/g) || []).map((x) => x.slice(2, -1)).join(' ') + ' ');
    code = code.replace(/'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"/g, ' 0 ');
    const declared = new Set();
    const declRe = /\b(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/g;
    let m;
    while ((m = declRe.exec(code))) declared.add(m[1]);
    const destr = /\b(?:const|let|var)\s*[{[]([^}\]=]*)[}\]]/g;
    while ((m = destr.exec(code))) for (const n of m[1].split(/[,\s:]+/)) if (/^[A-Za-z_$][\w$]*$/.test(n)) declared.add(n);
    // parameters: (a, b) =>, function x(a, b), method(a, b) {
    const params = /\(([^()]*)\)\s*(?:=>|\{)/g;
    while ((m = params.exec(code))) for (const n of m[1].split(',')) {
      const p = n.trim().replace(/=.*$/, '').replace(/^\.\.\./, '').trim();
      if (/^[A-Za-z_$][\w$]*$/.test(p)) declared.add(p);
    }
    const arrow1 = /([A-Za-z_$][\w$]*)\s*=>/g;
    while ((m = arrow1.exec(code))) declared.add(m[1]);
    const catchRe = /catch\s*\(\s*([A-Za-z_$][\w$]*)/g;
    while ((m = catchRe.exec(code))) declared.add(m[1]);
    const used = new Set();
    const idRe = /(^|[^.\w$])([A-Za-z_$][\w$]*)\b(?!\s*:(?!:))/g;
    while ((m = idRe.exec(code))) {
      const n = m[2];
      if (RESERVED.has(n) || declared.has(n) || known.has(n)) continue;
      if (/^\d/.test(n)) continue;
      used.add(n);
    }
    // the function's own name (method shorthand) isn't a free name
    const head = String(src).trim().match(/^(?:async\s+)?(?:function\s*\*?\s*)?([A-Za-z_$][\w$]*)\s*\(/);
    if (head) used.delete(head[1]);
    return [...used];
  };
})();
