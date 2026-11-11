import { BranchRecord, DEFAULT_BRANCHES } from './branches';
import { FloorRecord, DEFAULT_FLOORS } from './floor';

export interface RestaurantContext {
  branchId: string;
  branchName: string;
  floorId: string;
  floorName: string;
  serviceId: 'DINNER' | 'LUNCH' | 'LATE_NIGHT';
  serviceName: string;
  layoutId: string;
  heatmapMode: 'STATUS' | 'OCCUPANCY' | 'TURNOVER' | 'REVENUE' | 'KITCHEN_DELAY';
  viewMode: 'LIVE' | 'EDIT';
  role: 'MANAGER' | 'SERVER' | 'CHEF' | 'EXPO' | 'OWNER';
}

export function validateAndResolveContext(
  branches: BranchRecord[],
  floors: FloorRecord[],
  requestedBranchId?: string,
  requestedFloorId?: string,
  requestedServiceShift?: string
): RestaurantContext {
  const validBranch = branches.find((b) => b.id === requestedBranchId) || branches[0] || DEFAULT_BRANCHES[0];
  const branchFloors = floors.filter((f) => f.branchId === validBranch.id);
  const validFloor = branchFloors.find((f) => f.id === requestedFloorId) || branchFloors[0] || DEFAULT_FLOORS[0];

  const validShift =
    requestedServiceShift === 'Breakfast' ||
    requestedServiceShift === 'Lunch Rush' ||
    requestedServiceShift === 'Lunch Service' ||
    requestedServiceShift === 'Late Night' ||
    requestedServiceShift === 'Private Event'
      ? requestedServiceShift
      : 'Dinner Service';

  return {
    branchId: validBranch.id,
    branchName: validBranch.name,
    floorId: validFloor.id,
    floorName: validFloor.name,
    serviceId:
      validShift === 'Lunch Rush' || validShift === 'Lunch Service'
        ? 'LUNCH'
        : validShift === 'Late Night'
        ? 'LATE_NIGHT'
        : 'DINNER',
    serviceName: validShift,
    layoutId: validFloor.activeLayout,
    heatmapMode: 'STATUS',
    viewMode: 'LIVE',
    role: 'MANAGER',
  };
}
