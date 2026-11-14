import 'server-only';
import { AsyncLocalStorage } from 'node:async_hooks';

const operatorActor = new AsyncLocalStorage<string>();

export function withOperatorActor<T>(operatorId: string | undefined, callback: () => T): T {
  return operatorId ? operatorActor.run(operatorId, callback) : callback();
}

export function currentOperatorActor(): string | undefined {
  return operatorActor.getStore();
}
