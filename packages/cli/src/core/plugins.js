/** Plugin system for mcode CLI.
 * Plugins can register new commands, UI widgets, and event handlers.
 */

const plugins = new Map();
const widgets = new Map();
const commands = new Map();

/** Register a plugin.
 * @param {string} id - Unique plugin identifier
 * @param {object} plugin - { name, version, register }
 */
export function registerPlugin(id, plugin) {
  if (plugins.has(id)) {
    console.warn(`[plugins] Plugin "${id}" already registered — overwriting`);
  }
  plugins.set(id, plugin);

  // Register commands
  if (plugin.commands) {
    for (const cmd of plugin.commands) {
      commands.set(cmd.name, cmd);
    }
  }

  // Register widgets
  if (plugin.widgets) {
    for (const widget of plugin.widgets) {
      widgets.set(widget.id, widget);
    }
  }
}

/** Get all registered plugins. */
export function getPlugins() {
  return Array.from(plugins.values());
}

/** Get all registered commands (including plugin commands). */
export function getCommands() {
  return Array.from(commands.values());
}

/** Get all registered dashboard widgets. */
export function getWidgets() {
  return Array.from(widgets.values());
}

/** Find a command by name. */
export function findCommand(name) {
  return commands.get(name);
}

/** Dashboard widget registry — widgets can be placed on the dashboard layout. */
export const DASHBOARD_DEFAULTS = {
  layout: [
    { id: 'statusbar', x: 0, y: 0, width: '100%', height: 1 },
    { id: 'agents', x: 0, y: 1, width: 40, height: 8 },
    { id: 'plan', x: 40, y: 1, width: 'auto', height: 8 },
  ],
  widgetOrder: ['statusbar', 'agents', 'plan'],
};

/** Register a dashboard widget. */
export function registerWidget(id, widget) {
  widgets.set(id, widget);
}

/** Get dashboard layout. */
export function getDashboardLayout() {
  return DASHBOARD_DEFAULTS;
}
