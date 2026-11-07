const crypto = require('crypto');

module.exports = {
  v4: () => crypto.randomUUID(),
  v1: () => crypto.randomUUID(),
  v3: () => crypto.randomUUID(),
  v5: () => crypto.randomUUID(),
  NIL: '00000000-0000-0000-0000-000000000000',
  validate: (uuid) => typeof uuid === 'string' && uuid.length === 36,
  version: () => 4,
  parse: (uuid) => Buffer.from(uuid.replace(/-/g, ''), 'hex'),
  stringify: (buf) => [
    buf.toString('hex', 0, 4),
    buf.toString('hex', 4, 6),
    buf.toString('hex', 6, 8),
    buf.toString('hex', 8, 10),
    buf.toString('hex', 10, 16)
  ].join('-'),
};
