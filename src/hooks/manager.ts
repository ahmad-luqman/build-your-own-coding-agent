import type { Hook, HookEvent, HookContext, HookDecision } from "../types.js";

export class HookManager {
  private hooks: Hook[] = [];

  register(hook: Hook): void {
    this.hooks.push(hook);
  }

  async run(event: HookEvent, ctx: HookContext): Promise<HookDecision> {
    const relevant = this.hooks.filter((h) => h.event === event);

    for (const hook of relevant) {
      const decision = await hook.handler(ctx);
      if (!decision.allowed) {
        return decision;
      }
    }

    return { allowed: true };
  }
}
