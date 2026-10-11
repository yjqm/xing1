'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

function noop() {}
const gradient = { addColorStop: noop };
const context2d = new Proxy({
  createLinearGradient: () => gradient,
  measureText: text => ({ width: String(text).length * 7 }),
  setTransform: noop,
}, {
  get(target, key) {
    if (key in target) return target[key];
    if (typeof key === 'symbol') return target[key];
    return noop;
  },
  set(target, key, value) { target[key] = value; return true; },
});

const sandbox = {
  console,
  Math,
  Number,
  Object,
  Array,
  isFinite,
  window: {},
  document: { getElementById: () => null },
  VizEngine: {
    W: 760,
    H: 380,
    ctx: context2d,
    toScreen(x, y, xMin, xMax, yMin, yMax) {
      const pad = 40;
      return [
        pad + (x - xMin) / (xMax - xMin) * (this.W - 2 * pad),
        (this.H - pad) - (y - yMin) / (yMax - yMin) * (this.H - 2 * pad),
      ];
    },
  },
  vizTypes: {},
};
sandbox.window = sandbox;
vm.createContext(sandbox);
const source = fs.readFileSync(path.resolve(__dirname, '..', 'la_viz_pro.js'), 'utf8');
vm.runInContext(source, sandbox, { filename: 'la_viz_pro.js' });

const ids = Object.keys(sandbox.vizTypes).sort();
if (ids.length !== 35) throw new Error(`Expected 35 visualizations, got ${ids.length}`);
for (const id of ids) {
  const viz = sandbox.vizTypes[id];
  const params = Object.fromEntries(viz.params.map(p => [p.id, p.default]));
  try { viz.render(params); }
  catch (error) { throw new Error(`${id} render failed: ${error.stack || error.message}`); }
}
console.log(`Linear algebra visualization smoke test passed (${ids.length}/35).`);
