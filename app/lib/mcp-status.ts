import type { McpStatus } from "~~/shared/data/mcp-landscape"

// Single source of truth for the MCP status → Tailwind token mapping.
// `dot` colours the status dot, `surface` is the soft badge fill+text, and
// `border` the outline for an interactive (toggled-on) chip. Consumed by the
// StatusBadge (display) and StatusChip (filter) components so the
// released/dev/none palette lives in exactly one place.
export interface McpStatusClasses {
  dot: string
  surface: string
  border: string
}

const STATUS_CLASSES: Record<McpStatus, McpStatusClasses> = {
  released: {
    dot: "bg-(--color-status-released)",
    surface: "bg-(--color-status-released-bg) text-(--color-status-released)",
    border: "border-(--color-status-released)",
  },
  dev: {
    dot: "bg-(--color-status-dev)",
    surface: "bg-(--color-status-dev-bg) text-(--color-status-dev)",
    border: "border-(--color-status-dev)",
  },
  none: {
    dot: "bg-(--color-status-none)",
    surface: "bg-(--color-status-none-bg) text-(--color-status-none)",
    border: "border-(--color-status-none)",
  },
}

export function mcpStatusClasses(status: McpStatus): McpStatusClasses {
  return STATUS_CLASSES[status]
}
