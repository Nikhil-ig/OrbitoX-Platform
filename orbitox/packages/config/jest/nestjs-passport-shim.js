const PassportModule = {
  register: () => ({ module: class {}, exports: [] }),
};

const PassportStrategy = (StrategyClass, name) => class {};
const AuthGuard = (type) => class {};

module.exports = {
  PassportModule,
  PassportStrategy,
  AuthGuard,
};
