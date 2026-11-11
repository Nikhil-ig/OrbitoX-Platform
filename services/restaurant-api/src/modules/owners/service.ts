import type { OwnersRepository } from './repository';

export class OwnersService {
  constructor(private repo: OwnersRepository) {}
}
