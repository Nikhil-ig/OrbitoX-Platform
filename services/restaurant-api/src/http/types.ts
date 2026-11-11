import * as http from 'http';
import * as url from 'url';
import type { BranchRecord, FloorRecord, RestaurantContext } from '../../packages/domain';
import type { RestaurantRepository } from '../../packages/storage';
import type { PosService } from '@orbitox-io/pos';

export interface VerifiedBridgeContext {
  tenantId: string;
  principal: { sub: string; scopes: string[] };
}

export interface PreTenantRouteContext {
  req: http.IncomingMessage;
  res: http.ServerResponse;
  pathname: string;
  method: string;
  parsedUrl: url.UrlWithParsedQuery;
  verifiedBridge: VerifiedBridgeContext | null;
  tenantContext?: any;
}

export interface TenantRouteContext {
  req: http.IncomingMessage;
  res: http.ServerResponse;
  pathname: string;
  method: string;
  parsedUrl: url.UrlWithParsedQuery;
  tenantContext: any;
  repo: RestaurantRepository;
  posService: PosService;
  branches: BranchRecord[];
  floors: FloorRecord[];
  context: RestaurantContext;
  currentBranch: BranchRecord;
  currentFloor: FloorRecord;
  serviceShift: string;
  requestIdentity: any;
  activeStaffToken?: string;
  activeStaffRole?: string;
}
