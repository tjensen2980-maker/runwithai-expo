// Backport RevenueCat/purchases-ios#6949 (included in 5.78.0).
// Moving the initializer into the struct suppresses Swift's synthesized
// memberwise initializer, which conflicts with the public throwing initializer.
const fs = require('node:fs');

function patch(source) {
  const block = /    \/\/\/ "Designated" initializer\r?\n    private init\(stringRepresentation: String, underlyingColor: \(any Sendable\)\?\) \{\r?\n        self\.stringRepresentation = stringRepresentation\r?\n        self\._underlyingColor = underlyingColor\r?\n    \}/g;
  const matches = [...source.matchAll(block)];
  const boundary = source.indexOf('// MARK: - Public constructors');
  if (matches.length !== 1 || boundary < 0) {
    throw new Error('Unrecognized RevenueCat PaywallColor source; review Swift compatibility patch.');
  }
  if (matches[0].index < boundary) return source;
  const anchor = '    fileprivate var _underlyingColor: (any Sendable)?';
  if (!source.includes(anchor)) throw new Error('RevenueCat color storage declaration missing.');
  const newline = source.includes('\r\n') ? '\r\n' : '\n';
  return source.replace(block, '').replace(anchor, anchor + newline + newline + matches[0][0]);
}

module.exports = patch;
if (require.main === module) {
  const file = process.argv[2];
  const original = fs.readFileSync(file, 'utf8');
  const updated = patch(original);
  if (updated !== original) {
    fs.chmodSync(file, 0o644);
    fs.writeFileSync(file, updated);
    console.log('Applied RevenueCat Swift initializer compatibility fix.');
  }
}
