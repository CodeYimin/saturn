import { invoke } from '@tauri-apps/api'
import { emit } from '@tauri-apps/api/event'
import { hasActionKey } from './query/shortcut-key'

interface Accelerator {
  command: boolean
  shift: boolean
  key: string
}

interface Shortcut {
  event: string
  accelerator: Accelerator
}

function jsToTauriKeyCode(key: string): string {
  if (key.includes('Key')) {
    return key.replace('Key', '')
  } else if (key === 'Comma') {
    return ','
  } else {
    return key
  }
}

export async function setupShortcuts() {
  const shortcuts: Shortcut[] = await invoke('platform_shortcuts')

  if (!shortcuts.length) {
    return
  }

  const keys = new Map<string, Shortcut[]>()

  shortcuts.forEach((shortcut) => {
    if (!shortcut.accelerator) {
      return
    }

    let list = keys.get(shortcut.accelerator.key)

    if (!list) {
      list = []
      keys.set(shortcut.accelerator.key, list)
    }

    list.push(shortcut)
  })

  window.addEventListener('keydown', async (event) => {
    const shortcut = keys
      .get(jsToTauriKeyCode(event.code))
      ?.find((shortcut) => {
        return (
          shortcut.accelerator.command == hasActionKey(event) &&
          shortcut.accelerator.shift == event.shiftKey
        )
      })

    if (!shortcut) {
      return
    }

    event.preventDefault()
    await emit(shortcut.event)
  })
}
