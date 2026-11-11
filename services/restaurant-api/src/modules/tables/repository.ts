import type { RestaurantRepository } from '../../../packages/storage';
import type { TableFloorRecord, FloorRecord, BranchRecord } from '../../../packages/domain';

export class TablesRepository {
  constructor(public readonly repo: RestaurantRepository) {}

  async getTables() { return this.repo.getTables(); }
  async getTable(id: string) { return this.repo.getTable(id); }
  async saveFloorTables(tables: TableFloorRecord[]) { return this.repo.saveFloorTables(tables); }
  async deleteTable(id: string) { return this.repo.deleteTable(id); }
  async getFloors(branchId?: string) { return this.repo.getFloors(branchId); }
  async getFloor(id: string) { return this.repo.getFloor(id); }
  async saveFloor(floor: FloorRecord) { return this.repo.saveFloor(floor); }
  async deleteFloor(id: string) { return this.repo.deleteFloor(id); }
  async getBranches() { return this.repo.getBranches(); }
  async getBranch(id: string) { return this.repo.getBranch(id); }
  async saveBranch(branch: BranchRecord) { return this.repo.saveBranch(branch); }
  async deleteBranch(id: string) { return this.repo.deleteBranch(id); }
}
