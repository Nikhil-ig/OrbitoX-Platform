import { CustomDomainService } from '../../../packages/domain/domains';
import { TenancyRepository } from './repository';

export class TenancyService {
  constructor(private repo: TenancyRepository, private domainService?: CustomDomainService) {}

  async verifyDomain(tenantId: string, domain: string) {
    if (this.domainService) {
      return this.domainService.verifyCustomDomain(tenantId, domain);
    }
    return { verified: true };
  }
}
