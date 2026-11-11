import type { RestaurantRepository } from '../../../packages/storage';
import type { KitchenTask } from '../../../packages/domain';

export class KitchenRepository {
  constructor(public readonly repo: RestaurantRepository) {}

  async getTasks(branchId?: string) { return this.repo.getKitchenTasks(branchId); }
  async addTask(task: KitchenTask) { return this.repo.addKitchenTask(task); }
  async updateTaskStatus(taskId: string, status: string, bumpMetadata?: any) {
    return this.repo.updateKitchenTaskStatus(taskId, status, bumpMetadata);
  }
}
