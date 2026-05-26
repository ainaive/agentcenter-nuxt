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

  if (to.path.endsWith("/extensions") && to.query.category === "mcp") {
    const { category: _category, ...rest } = to.query
    return navigateTo(
      { path: to.path.replace(/\/extensions$/, "/mcp"), query: rest },
      { replace: true },
    )
  }
})
