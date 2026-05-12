import { createAuthClient } from "better-auth/vue"

const _client = createAuthClient()

export function useAuth() {
  return _client
}
