import { TenantProvisioningService } from '../../../packages/domain/provisioning';
import { ProvisioningRepository } from './repository';

export class ProvisioningService {
  constructor(private repo: ProvisioningRepository) {}
}
