const assert = require("node:assert/strict");
const { test } = require("node:test");
const { parseSvgOutline } = require("../dist/outline");

test("keeps nested groups, original names and source ranges", () => {
  const source = '<?xml version="1.0"?>\r\n<!-- <g/> -->\r\n'
    + '<svg><g id="a&amp;b"><g id="inner"><rect/><text>😀</text></g></g></svg>';
  const [svg] = parseSvgOutline(source);
  const [outer] = svg.children;
  const [inner] = outer.children;
  assert.deepEqual([svg.name, outer.name, inner.name], ["svg", "g#a&b", "g#inner"]);
  assert.deepEqual(inner.children.map(node => node.name), ["rect", "text"]);
  assert.equal(source.slice(svg.start, svg.end), source.slice(source.indexOf("<svg>")));
  for (const child of inner.children) {
    assert.equal(source.slice(child.start, child.nameEnd), "<" + child.name);
  }
  assert.equal(source.slice(inner.children[1].start, inner.children[1].end), "<text>😀</text>");
});

test("returns no symbols for partial XML and reflects the next valid edit", () => {
  assert.equal(parseSvgOutline('<svg><rect id="old"/></svg>')[0].children[0].name, "rect#old");
  for (const partial of ["<svg><rect", "<svg><rect></svg>", "<svg/> <g/>"]) {
    assert.deepEqual(parseSvgOutline(partial), []);
  }
  assert.equal(parseSvgOutline('<svg><rect id="new"/></svg>')[0].children[0].name, "rect#new");
});
