module.exports = {
  authenticator: {
    generateSecret: () => 'KVKFKRCPNZQUYMLXOVYDSQKJKZDTSRLD',
    keyuri: (user, service, secret) => `otpauth://totp/${service}:${user}?secret=${secret}&issuer=${service}`,
    generate: () => '123456',
    check: (token, secret) => true,
    verify: (options) => true,
  },
  totp: {
    generate: () => '123456',
    check: (token, secret) => true,
    verify: (options) => true,
  },
};
