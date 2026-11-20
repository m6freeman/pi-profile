import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

/**
 * Tokens Per Second Extension
 *
 * Displays the current generation speed (tokens per second) in the footer status bar
 * and ensures the TPS text is right-aligned in the footer.
 */

export default function (pi: ExtensionAPI) {
	let startTime = 0;
	let tokenCount = 0;
	let lastUpdate = 0;
	let maxTps = 0;

	// Keep the current TPS text in a status entry so other extensions can see it via footerData
	pi.on("session_start", async (_event, ctx) => {
		ctx.ui.setStatus("tps", "0/0 t/s");

		// Install a custom footer that places our "tps" status at the right edge.
		ctx.ui.setFooter((tui, theme, footerData) => {
			// Re-render when branch changes
			const unsub = footerData.onBranchChange(() => tui.requestRender());

			return {
				dispose: unsub,
				invalidate() {},
				render(width: number): string[] {
					const statuses = footerData.getExtensionStatuses();

					// Build left string using all extension statuses except "tps"
					const leftItems: string[] = [];
					let tpsText = "";
					for (const [k, v] of statuses.entries()) {
						if (k === "tps") {
							tpsText = v || "";
						} else if (v) {
							leftItems.push(v);
						}
					}

					const left = theme.fg("dim", leftItems.join(" "));

					// Right column: TPS (if any) plus model id/branch
					const branch = footerData.getGitBranch();
					const branchStr = branch ? ` (${branch})` : "";
					const modelStr = ctx.model?.id || "no-model";
					const right = (tpsText ? tpsText + " " : "") + theme.fg("dim", `${modelStr}${branchStr}`);

					const pad = " ".repeat(Math.max(1, width - visibleWidth(left) - visibleWidth(right)));
					return [truncateToWidth(left + pad + right, width)];
				},
			};
		});
	});

	pi.on("message_start", async (event, ctx) => {
		if (event.message.role === "assistant") {
			startTime = Date.now();
			tokenCount = 0;
			lastUpdate = 0;
			maxTps = 0;
			ctx.ui.setStatus("tps", "0/0 t/s");
		}
	});

	pi.on("message_update", async (event, ctx) => {
		if (event.message.role !== "assistant") return;

		// The assistantMessageEvent is present during streaming.
		// @ts-ignore
		if (event.assistantMessageEvent) {
			tokenCount++;
			const now = Date.now();
			const elapsed = (now - startTime) / 1000;

			// Throttle UI updates to at most once every 100ms
			if (now - lastUpdate > 100) {
				if (elapsed > 0.2) {
					const tps = tokenCount / elapsed;
					if (tps > maxTps) {
						maxTps = tps;
					}
					ctx.ui.setStatus("tps", `${tps.toFixed(1)}/${maxTps.toFixed(1)} t/s`);
					lastUpdate = now;
				}
			}
		}
	});

	pi.on("message_end", async (event, ctx) => {
		if (event.message.role === "assistant") {
			ctx.ui.setStatus("tps", `0/${maxTps.toFixed(1)} t/s`);
		}
	});
}
