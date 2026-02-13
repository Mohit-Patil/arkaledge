import { resolve } from "node:path";
import type { PluginRef } from "../types.js";
import type { ArkaledgePlugin } from "./plugin-types.js";

/**
 * Load plugins from config paths. Each plugin directory must have a default export
 * conforming to ArkaledgePlugin.
 */
export async function loadPlugins(
  pluginRefs: PluginRef[],
  baseDir: string,
): Promise<ArkaledgePlugin[]> {
  const plugins: ArkaledgePlugin[] = [];

  for (const ref of pluginRefs) {
    const pluginPath = resolve(baseDir, ref.path);
    try {
      const mod = await import(pluginPath);
      const plugin: ArkaledgePlugin = mod.default ?? mod;
      if (!plugin.name || !plugin.tools) {
        throw new Error(
          `Plugin at ${pluginPath} does not export a valid ArkaledgePlugin`,
        );
      }
      plugins.push(plugin);
    } catch (error) {
      console.error(
        `Failed to load plugin "${ref.name}" from ${pluginPath}:`,
        error,
      );
    }
  }

  return plugins;
}
