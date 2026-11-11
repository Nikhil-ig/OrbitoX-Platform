import type { DinersRepository } from './repository';

export class DinersService {
  constructor(private repo: DinersRepository) {}
}
