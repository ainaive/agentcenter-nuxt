// Shared, per-extension install state. Both the hero InstallButton and the
// "Direct download" method read/write the same `useState` entry (keyed by
// extension id), so an install is recorded at most once per extension per
// session — a download after a hero-button install is a no-op, and vice
// versa, which keeps `extensions.downloadsCount` from being double-counted.
//
// Recording requires a signed-in user (the bundle download itself does not).
// Anonymous callers get a no-op `record()` and a usable download anyway.
export function useInstallState(extensionId: string) {
  const session = useAuth().useSession()

  const installed = useState(`install:${extensionId}`, () => false)
  const pending = useState(`install-pending:${extensionId}`, () => false)

  const isAuthed = computed(() => Boolean(session.value.data?.user))

  async function record(version?: string) {
    if (installed.value || pending.value || !isAuthed.value) return
    pending.value = true
    try {
      await $fetch("/api/internal/installs", {
        method: "POST",
        body: { extensionId, version },
      })
      installed.value = true
    } catch (err) {
      console.error("install record failed", err)
    } finally {
      pending.value = false
    }
  }

  return { installed, pending, isAuthed, record }
}
