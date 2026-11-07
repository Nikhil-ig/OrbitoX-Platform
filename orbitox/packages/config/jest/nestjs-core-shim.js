require('reflect-metadata');

class Reflector {
  get(metadataKey, target) {
    return Reflect.getMetadata(metadataKey, target);
  }
  getAll(metadataKey, targets) {
    return targets.map((t) => this.get(metadataKey, t));
  }
  getAllAndOverride(metadataKey, targets) {
    for (const target of targets) {
      const res = this.get(metadataKey, target);
      if (res !== undefined) return res;
    }
    return undefined;
  }
  getAllAndMerge(metadataKey, targets) {
    const list = [];
    for (const target of targets) {
      const res = this.get(metadataKey, target);
      if (Array.isArray(res)) list.push(...res);
      else if (res) list.push(res);
    }
    return list;
  }
}

module.exports = {
  Reflector,
  NestFactory: {
    create: async () => ({
      listen: async () => {},
      close: async () => {},
    }),
  },
};
