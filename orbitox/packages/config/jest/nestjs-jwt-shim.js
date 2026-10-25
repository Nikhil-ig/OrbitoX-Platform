class JwtService {
  sign(payload, options) {
    return 'mock_jwt_token';
  }
  verify(token, options) {
    return { id: 'mock_user', ...payload };
  }
  decode(token) {
    return { id: 'mock_user' };
  }
}

const JwtModule = {
  register: () => ({ module: class {}, providers: [JwtService], exports: [JwtService] }),
  registerAsync: () => ({ module: class {}, providers: [JwtService], exports: [JwtService] }),
};

module.exports = {
  JwtModule,
  JwtService,
};
