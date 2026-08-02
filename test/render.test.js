import test from 'node:test';
import assert from 'node:assert/strict';

import { renderQR, renderQRNode, SHAPES, PATTERNS, EYE_SHAPES, FRAMES } from '../src/index.js';
import { getQRMatrix } from '../src/encoder.js';

const TEXT = 'https://koloqr.com';

test('encodes to a square matrix of the right version', () => {
  const matrix = getQRMatrix(TEXT);
  assert.equal(matrix.length, 29, 'error correction is fixed at H, so this payload is version 3');
  for (const row of matrix) assert.equal(row.length, matrix.length);
});

test('every shape and frame renders a well-formed SVG', () => {
  for (const shape of SHAPES) {
    for (const frame of FRAMES) {
      const svg = renderQR({ text: TEXT, shape, frame });
      const where = `${shape}/${frame}`;
      assert.match(svg, /^<svg /, where);
      assert.match(svg, /<\/svg>$/, where);
      assert.match(svg, /xmlns="http:\/\/www\.w3\.org\/2000\/svg"/, where);
      assert.match(svg, /viewBox="0 0 \d+ \d+"/, where);
      // A code this size is thousands of elements; anything tiny means an
      // empty or half-built tree.
      assert.ok(svg.length > 2000, `${where} produced only ${svg.length} bytes`);
      assert.ok(!svg.includes('NaN'), `${where} leaked a NaN into an attribute`);
      assert.ok(!svg.includes('undefined'), `${where} leaked an undefined into an attribute`);
    }
  }
});

test('every module pattern renders', () => {
  for (const pattern of PATTERNS) {
    const svg = renderQR({ text: TEXT, shape: 'circle', pattern });
    assert.ok(svg.length > 2000, `${pattern} produced only ${svg.length} bytes`);
    assert.ok(!svg.includes('NaN'), `${pattern} leaked a NaN`);
  }
});

test('every eye shape renders', () => {
  for (const eyeShape of EYE_SHAPES) {
    assert.ok(renderQR({ text: TEXT, eyeShape }).length > 2000, eyeShape);
  }
});

test('output is deterministic', () => {
  // The scatter in the 'star' pattern used to be seeded off Math.random at
  // import time, which made every process draw a different code.
  const once = renderQR({ text: TEXT, pattern: 'star' });
  const twice = renderQR({ text: TEXT, pattern: 'star' });
  assert.equal(once, twice);
});

test('the seed changes the star scatter and nothing else', () => {
  const a = renderQR({ text: TEXT, pattern: 'star', seed: 1 });
  const b = renderQR({ text: TEXT, pattern: 'star', seed: 2 });
  assert.notEqual(a, b);
  const c = renderQR({ text: TEXT, pattern: 'dots', seed: 1 });
  const d = renderQR({ text: TEXT, pattern: 'dots', seed: 2 });
  assert.equal(c, d, 'patterns other than star do not read the seed');
});

test('colours reach the output', () => {
  const svg = renderQR({ text: TEXT, color: '#ff0000', background: '#00ff00', eyeShape: 'square' });
  assert.ok(svg.includes('#ff0000'));
  assert.ok(svg.includes('#00ff00'));
});

test('a transparent background draws no background rect', () => {
  const opaque = renderQRNode({ text: TEXT, background: '#ffffff' });
  const clear = renderQRNode({ text: TEXT, background: 'transparent' });
  const hasBackground = (node) => node.childNodes.some((c) => c.getAttribute('id') === 'Background');
  assert.ok(hasBackground(opaque));
  assert.ok(!hasBackground(clear));
});

test('bad options are rejected with a useful message', () => {
  assert.throws(() => renderQR({}), /text: expected a non-empty string/);
  assert.throws(() => renderQR({ text: '' }), /text: expected a non-empty string/);
  assert.throws(() => renderQR({ text: TEXT, shape: 'octagon' }), /shape: expected one of/);
  assert.throws(() => renderQR({ text: TEXT, pattern: 'blobs' }), /pattern: expected one of/);
  assert.throws(() => renderQR({ text: TEXT, frame: 'ornate' }), /frame: expected one of/);
  assert.throws(() => renderQR({ text: TEXT, eyeShape: 'oval' }), /eyeShape: expected one of/);
  assert.throws(() => renderQR({ text: TEXT, mask: 9 }), /mask: expected an integer 0-7/);
});

test('a forced mask changes the code', () => {
  assert.notEqual(renderQR({ text: TEXT, mask: 0 }), renderQR({ text: TEXT, mask: 1 }));
});

test('renderQRNode hands back a tree that can still be edited', () => {
  const node = renderQRNode({ text: TEXT });
  node.setAttribute('data-source', 'test');
  assert.equal(node.nodeName, 'svg');
  assert.ok(node.childNodes.length > 0);
  assert.match(node.toString(), /data-source="test"/);
});

test('long payloads still encode', () => {
  const svg = renderQR({ text: 'https://example.com/' + 'a'.repeat(300) });
  assert.ok(svg.length > 2000);
});
