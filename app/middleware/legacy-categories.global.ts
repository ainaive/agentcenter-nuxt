const CATEGORY_REDIRECTS: Record<string, string> = {
  skills: "/skills",
  mcp: "/mcp",
  slash: "/commands",
  plugins: "/plugins",
  cli: "/cli",
}

export default defineNuxtRouteMiddleware((to) => {
  if (to.path.endsWith("/mcp-panorama")) {
    return navigateTo(
      {
        path: to.path.replace(/\/mcp-panorama$/, "/mcp/panorama"),
        query: to.query,
      },
      { replace: true },
    )
  }

  if (to.path.endsWith("/extensions") && typeof to.query.category === "string") {
    const dest = CATEGORY_REDIRECTS[to.query.category]
    if (dest) {
      const { category: _category, ...rest } = to.query
      return navigateTo(
        { path: to.path.replace(/\/extensions$/, dest), query: rest },
        { replace: true },
      )
    }
  }
})
