import { orbitox } from '@orbitox/runtime';
import { WorkflowRecipe } from './recipes';

export class HospitalWorkflowRunner {
  private static registeredRecipes: Map<string, WorkflowRecipe> = new Map();

  static registerRecipe(recipe: WorkflowRecipe) {
    this.registeredRecipes.set(recipe.id, recipe);

    // Wire trigger event listener
    orbitox.events.on(recipe.trigger.eventName, async (payload: any) => {
      console.log(`⚡ [Workflow Triggered] Recipe '${recipe.name}' fired on event '${recipe.trigger.eventName}'`);

      // Evaluate trigger conditions if specified
      if (recipe.trigger.evaluate && !recipe.trigger.evaluate(payload)) {
        console.log(`⏩ [Workflow Skip] Trigger condition not met.`);
        return;
      }

      // Execute action chain
      let currentData = payload;
      for (const action of recipe.actions) {
        try {
          const actionOutput = await action.execute(currentData);
          currentData = { ...currentData, ...actionOutput };
        } catch (err: any) {
          console.error(`❌ [Workflow Error in Action ${action.name}]:`, err.message);
          break;
        }
      }
      console.log(`✅ [Workflow Complete] '${recipe.name}' finished successfully.`);
    });
  }

  static getActiveRecipes(): WorkflowRecipe[] {
    return Array.from(this.registeredRecipes.values());
  }
}
