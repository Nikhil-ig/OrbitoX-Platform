import { Injectable, Logger } from '@nestjs/common';

export interface PatientRecord {
  id: string;
  mrn: string; // Medical Record Number
  name: string;
  age: number;
  bloodGroup: string;
  primaryDoctor: string;
  status: 'admitted' | 'outpatient' | 'discharged';
}

@Injectable()
export class HmsService {
  private readonly logger = new Logger(HmsService.name);

  getPatients(contextId: string): PatientRecord[] {
    this.logger.log(`Fetching patient EHR records for context ${contextId}`);
    return [
      { id: 'pat-1', mrn: 'MRN-90812', name: 'Robert Vance', age: 48, bloodGroup: 'O+', primaryDoctor: 'Dr. House', status: 'admitted' },
      { id: 'pat-2', mrn: 'MRN-90813', name: 'Clara Oswald', age: 29, bloodGroup: 'A-', primaryDoctor: 'Dr. Watson', status: 'outpatient' },
    ];
  }
}
