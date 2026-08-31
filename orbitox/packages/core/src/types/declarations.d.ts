declare module 'bcrypt' {
  export function hash(data: string | Buffer, saltOrRounds: string | number): Promise<string>;
  export function compare(data: string | Buffer, encrypted: string): Promise<boolean>;
  export function genSalt(rounds?: number): Promise<string>;
}

declare module 'passport-jwt' {
  import { Strategy as PassportStrategy } from 'passport';
  export class Strategy extends PassportStrategy {
    constructor(opt: any, verify: any);
  }
  export namespace ExtractJwt {
    export function fromAuthHeaderAsBearerToken(): (req: any) => string | null;
    export function fromHeader(header_name: string): (req: any) => string | null;
  }
}
