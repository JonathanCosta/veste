import { ref } from 'vue'

// ─── Module‑level singleton state ────────────────────────────────────────
// Only one dialog can be visible at a time. The CustomDialog component reads
// these refs and the composable exposes methods to show/resolve dialogs.

const visible = ref(false)
const title = ref('')
const message = ref('')
const type = ref('alert') // 'alert' | 'confirm'

/** Resolver function set by show() and called by resolveDialog() */
let resolveFn = null

/**
 * Composable for a global reactive dialog (alert / confirm).
 *
 * Usage (component):
 *   const dialog = useDialog()
 *   const ok = await dialog.confirm('Tem certeza?')
 *   if (ok) { … }
 *
 * Usage (CustomDialog.vue):
 *   const { visible, title, message, type, resolveDialog } = useDialog()
 */
export function useDialog() {
  /**
   * Internal — show the dialog and return a Promise that resolves when the
   * user dismisses it.
   */
  function show(opts) {
    // If a dialog is already visible, resolve it as cancelled first
    if (resolveFn) {
      resolveFn(false)
      resolveFn = null
    }

    title.value = opts.title ?? ''
    message.value = opts.message ?? ''
    type.value = opts.type ?? 'alert'
    visible.value = true

    return new Promise((resolve) => {
      resolveFn = resolve
    })
  }

  /** Show a confirm dialog. Resolves to `true` or `false`. */
  function confirm(messageText, titleText = 'Confirmação') {
    return show({ type: 'confirm', message: messageText, title: titleText })
  }

  /** Show an alert dialog. Resolves to `true` when dismissed. */
  function alert(messageText, titleText = 'Aviso') {
    return show({ type: 'alert', message: messageText, title: titleText })
  }

  /** Resolve the current dialog with a given value and close it. */
  function resolveDialog(value) {
    if (resolveFn) {
      resolveFn(value)
      resolveFn = null
    }
    visible.value = false
  }

  return {
    visible,
    title,
    message,
    type,
    confirm,
    alert,
    resolveDialog,
  }
}
