import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  // Register /exit as an alias for /quit
  pi.registerCommand("exit", {
    description: "Alias for /quit - Exit pi cleanly",
    handler: async (_args, ctx) => {
      // Request graceful shutdown just like /quit
      ctx.shutdown();
    },
  });
}
