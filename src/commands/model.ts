import type { CommandDefinition } from "../types.js";

export const modelCommand: CommandDefinition = {
  name: "model",
  description: "Show or switch the current model",
  usage: "/model [model-id]",
  execute(args, ctx) {
    const newModelId = args.trim();
    if (!newModelId) {
      return { message: `Current model: \`${ctx.config.modelId}\`` };
    }

    ctx.setModel(newModelId);
    return { message: `Model switched to \`${newModelId}\`` };
  },
};
