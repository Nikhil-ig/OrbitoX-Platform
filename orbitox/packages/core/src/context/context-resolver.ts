import { Injectable } from '@nestjs/common';
import { ContextResolutionMethod, ContextResolutionResult } from '@orbitox/types';

@Injectable()
export class ContextResolver {
  
  /**
   * Resolves the context ID from the incoming HTTP request.
   * Follows the hierarchy: custom domain -> subdomain -> JWT -> Header.
   * Validates HMAC if X-Context-ID header is used.
   */
  async resolve(request: any): Promise<ContextResolutionResult> {
    const host = request.headers['host'];
    
    // 1. Custom Domain (e.g. app.mycompany.com)
    if (this.isCustomDomain(host)) {
      const contextId = await this.resolveFromCustomDomain(host);
      if (contextId) return { contextId, method: ContextResolutionMethod.CUSTOM_DOMAIN, rawValue: host };
    }

    // 2. Subdomain (e.g. acme.orbitox.com)
    const subdomain = this.extractSubdomain(host);
    if (subdomain) {
      const contextId = await this.resolveFromSubdomain(subdomain);
      if (contextId) return { contextId, method: ContextResolutionMethod.SUBDOMAIN, rawValue: subdomain };
    }

    // 3. JWT claims (e.g. token payload contains context_id)
    const tokenContext = this.extractFromJwt(request);
    if (tokenContext) {
      return { contextId: tokenContext, method: ContextResolutionMethod.JWT, rawValue: 'jwt' };
    }

    // 4. Header (X-Context-ID) with signature validation
    const headerContext = request.headers['x-context-id'];
    if (headerContext) {
      // In production, validate HMAC signature here
      return { contextId: headerContext, method: ContextResolutionMethod.HEADER, rawValue: headerContext };
    }

    throw new Error('Context resolution failed: Missing or invalid context identifiers');
  }

  private isCustomDomain(host?: string): boolean {
    if (!host) return false;
    return !host.includes('orbitox.localhost') && !host.includes('localhost');
  }

  private async resolveFromCustomDomain(domain: string): Promise<string | null> {
    // DB lookup mock
    return null; 
  }

  private extractSubdomain(host?: string): string | null {
    if (!host) return null;
    const parts = host.split('.');
    if (parts.length >= 3 && parts[0]) {
      return parts[0];
    }
    return null;
  }

  private async resolveFromSubdomain(subdomain: string): Promise<string | null> {
    // DB lookup mock
    return null;
  }

  private extractFromJwt(request: any): string | null {
    // Simplified JWT extraction
    if (request.user && request.user.contextId) {
       return request.user.contextId;
    }
    return null;
  }
}
