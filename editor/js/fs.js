/* Linear Maze Editor — js/fs.js
 * Access to the game folder.
 *   folder   (Chrome, Edge): the File System Access API; reads and writes in place.
 *            The folder handle is remembered (IndexedDB) so the next visit is one click.
 *   readonly (other browsers): a folder picked with <input webkitdirectory>; saving downloads files.
 *   dev      (?dev in the URL, served over http): reads with fetch from the parent folder,
 *            keeps writes in memory (used by the automated tests).
 */
'use strict';
(function () {
  const ED = window.ED;
  const fs = (ED.fs = { kind: null, name: '', writes: {} });

  // ------------------------------------------------------------ remembered handle (IndexedDB)
  const DB = 'lm-editor', STORE = 'handles';
  function idb() {
    return new Promise((res, rej) => {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }
  async function idbGet(key) {
    try {
      const db = await idb();
      return await new Promise((res) => {
        const q = db.transaction(STORE).objectStore(STORE).get(key);
        q.onsuccess = () => res(q.result);
        q.onerror = () => res(null);
      });
    } catch (e) {
      return null;
    }
  }
  async function idbSet(key, val) {
    try {
      const db = await idb();
      await new Promise((res) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(val, key);
        tx.oncomplete = res;
        tx.onerror = res;
      });
    } catch (e) {}
  }

  fs.supported = () => typeof window.showDirectoryPicker === 'function';
  fs.remembered = () => (fs.supported() ? idbGet('game') : Promise.resolve(null));

  async function useHandle(handle) {
    fs.kind = 'folder';
    fs.root = handle;
    fs.name = handle.name;
    fs.writes = {};
    await idbSet('game', handle);
  }
  /** Ask for the game folder. */
  fs.pick = async function () {
    const handle = await window.showDirectoryPicker({ id: 'linear-maze', mode: 'readwrite' });
    await useHandle(handle);
    return handle;
  };
  /** Re-open the remembered folder (needs a click for the permission prompt). */
  fs.reopen = async function (handle) {
    const opts = { mode: 'readwrite' };
    let p = await handle.queryPermission(opts);
    if (p !== 'granted') p = await handle.requestPermission(opts);
    if (p !== 'granted') throw new Error('Permission to edit the folder was not given.');
    await useHandle(handle);
    return handle;
  };
  fs.useFiles = function (fileList) {
    fs.kind = 'readonly';
    fs.files = new Map();
    let root = '';
    for (const f of fileList) {
      const rel = f.webkitRelativePath || f.name;
      if (!root) root = rel.split('/')[0];
      fs.files.set(rel.split('/').slice(1).join('/'), f);
    }
    fs.name = root;
    fs.writes = {};
  };
  fs.useDev = function (base, put) {
    fs.kind = 'dev';
    fs.base = base;
    fs.put = !!put;
    fs.name = 'dev: ' + base;
    fs.writes = {};
  };

  async function dirFor(path, create) {
    const parts = path.split('/').filter(Boolean);
    let dir = fs.root;
    for (const p of parts.slice(0, -1)) dir = await dir.getDirectoryHandle(p, { create: !!create });
    return { dir, name: parts[parts.length - 1] };
  }
  /** Read a file as text. Throws if it doesn't exist. */
  fs.read = async function (path) {
    if (path in fs.writes) return fs.writes[path];
    if (fs.kind === 'folder') {
      const { dir, name } = await dirFor(path);
      const fh = await dir.getFileHandle(name);
      return await (await fh.getFile()).text();
    }
    if (fs.kind === 'readonly') {
      const f = fs.files.get(path);
      if (!f) throw new Error('Missing file ' + path);
      return await f.text();
    }
    if (fs.kind === 'dev') {
      const r = await fetch(fs.base + path + '?t=' + Date.now());
      if (!r.ok) throw new Error('Missing file ' + path);
      return await r.text();
    }
    throw new Error('No folder is open.');
  };
  fs.readMaybe = async (path) => {
    try {
      return await fs.read(path);
    } catch (e) {
      return null;
    }
  };
  fs.modified = async function (path) {
    if (fs.kind !== 'folder') return 0;
    try {
      const { dir, name } = await dirFor(path);
      return (await (await dir.getFileHandle(name)).getFile()).lastModified;
    } catch (e) {
      return 0;
    }
  };
  fs.canWrite = () => fs.kind === 'folder' || fs.kind === 'dev';
  /** Write a text file, creating folders as needed. In read-only mode the file is downloaded instead. */
  fs.write = async function (path, text) {
    if (fs.kind === 'folder') {
      const { dir, name } = await dirFor(path, true);
      const fh = await dir.getFileHandle(name, { create: true });
      const w = await fh.createWritable();
      await w.write(text);
      await w.close();
      return 'written';
    }
    fs.writes[path] = text;
    if (fs.kind === 'dev' && fs.put) {
      const r = await fetch(fs.base + path, { method: 'PUT', body: text });
      if (!r.ok) throw new Error('PUT failed ' + r.status);
      return 'written';
    }
    if (fs.kind === 'readonly') {
      ED.download(path.split('/').pop(), text, 'text/javascript');
      return 'downloaded';
    }
    return 'memory';
  };
})();
