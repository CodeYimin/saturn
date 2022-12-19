import { computed, reactive } from 'vue'

import { tab } from './editor-state'

import { regular } from '../utils/text-size'
import { consumeBackwards, consumeForwards } from '../utils/alt-consume'
import { hasActionKey } from '../utils/shortcut-key'

export const lines = computed(() => tab()?.lines ?? ['Nothing yet.'])

export interface CursorPosition {
  line: number
  index: number
  offsetX: number
  offsetY: number
}

export const cursor = reactive({
  line: 0,
  index: 0,
  offsetX: 0,
  offsetY: 0,

  highlight: null
} as CursorPosition & { highlight: CursorPosition | null })

interface SelectionRange {
  startLine: number
  startIndex: number
  endLine: number
  endIndex: number
}

export function selectionRange(): SelectionRange | null {
  if (!cursor.highlight) {
     return null
  }

  // Took out technical debt here and the methods in EditorBody for selection.
  const highlightBeforeLine = cursor.highlight.line < cursor.line
  const highlightBeforeIndex = cursor.highlight.line === cursor.line
    && cursor.highlight.index < cursor.index

  if (highlightBeforeLine || highlightBeforeIndex) {
    console.assert(cursor.highlight.line <= cursor.line)
    return {
      startLine: cursor.highlight.line,
      startIndex: cursor.highlight.index,
      endLine: cursor.line,
      endIndex: cursor.index
    }
  } else {
    console.assert(cursor.highlight.line >= cursor.line)
    return {
      startLine: cursor.line,
      startIndex: cursor.index,
      endLine: cursor.highlight.line,
      endIndex: cursor.highlight.index
    }
  }
}

export function makeSelection() {
  if (!cursor.highlight) {
    cursor.highlight = {
      line: cursor.line,
      index: cursor.index,
      offsetX: cursor.offsetX,
      offsetY: cursor.offsetY
    }
  }
}

export function clearSelection() {
  cursor.highlight = null
}

export function setSelection(selection: boolean) {
  if (selection) {
    makeSelection()
  } else {
    clearSelection()
  }
}

export function dropSelection() {
  const range = selectionRange()

  const all = lines.value

  if (range) {
    // assert range.startLine >= range.endLine
    if (range.startLine == range.endLine) {
      const text = all[range.startLine]

      all[range.startLine] = text.substring(0, range.startIndex) + text.substring(range.endIndex)
    } else {
      const leading = all[range.startLine].substring(0, range.startIndex)
      const trailing = all[range.endLine].substring(range.endIndex)
      all[range.startLine] = leading + trailing

      // splice with multiple deleteCount seems bugged
      for (let a = range.startLine + 1; a <= range.endLine; a++) {
        all.splice(range.startLine + 1, 1)
      }
    }

    clearSelection()
    putCursor(range.startLine, range.startIndex)
  }
}

export function putCursor(line: number, index: number) {
  let underflow = false
  let overflow = false

  let actualLine = line

  if (actualLine >= lines.value.length) {
    overflow = true
    actualLine = lines.value.length - 1
  } else if (actualLine < 0) {
    underflow = true
    actualLine = 0
  }

  const text = lines.value[actualLine]

  let actualIndex: number

  if (underflow) {
    actualIndex = 0
  } else if (overflow) {
    actualIndex = text.length
  } else {
    actualIndex = Math.max(index, 0)
  }

  const leading = text.substring(0, actualIndex)
  const size = regular.calculate(leading)

  if (cursor.highlight
    && cursor.highlight.line === actualLine
    && cursor.highlight.index === actualIndex) {
    cursor.highlight = null
  }

  console.log()

  cursor.line = actualLine
  cursor.index = actualIndex
  cursor.offsetX = size.width
  cursor.offsetY = size.height * actualLine
}

function insert(text: string) {
  console.log('test')
  dropSelection()

  const all = lines.value

  const line = all[cursor.line]
  const leading = line.substring(0, cursor.index)
  const trailing = line.substring(cursor.index)

  // Mutate
  all[cursor.line] = leading + text + trailing
  putCursor(cursor.line, cursor.index + text.length)
}

function newline() {
  dropSelection()

  const all = lines.value

  const line = all[cursor.line]
  const leading = line.substring(0, cursor.index)
  const trailing = line.substring(cursor.index)

  // Mutate
  all[cursor.line] = leading
  all.splice(cursor.line + 1, 0, trailing)

  putCursor(cursor.line + 1, 0)
}

function backspace(alt: boolean = false) {
  const all = lines.value

  const line = all[cursor.line]

  if (cursor.highlight) {
    dropSelection()
  } else if (cursor.index > 0) {
    const consumption = alt ? consumeBackwards(line, cursor.index) : 1

    const leading = line.substring(0, cursor.index - consumption)
    const trailing = line.substring(cursor.index)

    // Mutate
    all[cursor.line] = leading + trailing

    putCursor(cursor.line, cursor.index - consumption)
  } else if(cursor.line > 0) {
    const leading = all[cursor.line - 1]
    const trailing = all[cursor.line]

    all[cursor.line - 1] = leading + trailing

    all.splice(cursor.line, 1)

    putCursor(cursor.line - 1, leading.length)
  }
}

function moveLeft(alt: boolean = false, shift: boolean = false) {
  const consume = alt
    ? consumeBackwards(lines.value[cursor.line], cursor.index)
    : 1

  let line = cursor.line
  let move = cursor.index - consume

  setSelection(shift)

  if (move < 0) {
    line -= 1
    move = lines.value[line].length
  }

  putCursor(line, move)
}

function moveRight(alt: boolean = false, shift: boolean = false) {
  const consume = alt
    ? consumeForwards(lines.value[cursor.line], cursor.index)
    : 1

  let line = cursor.line
  let move = cursor.index + consume

  setSelection(shift)

  if (lines.value[cursor.line].length < move) {
    line += 1
    move = 0
  }

  putCursor(line, move)
}

function moveDown(shift: boolean = false) {
  setSelection(shift)

  putCursor(cursor.line + 1, cursor.index)
}

function moveUp(shift: boolean = false) {
  setSelection(shift)

  putCursor(cursor.line - 1, cursor.index)
}

function handleActionKey(event: KeyboardEvent) {
  // assert hasActionKey(event)

  switch (event.key) {
    case 'a':
      if (lines.value.length) {
        const end = lines.value.length - 1
        putCursor(0, 0)
        makeSelection()
        putCursor(end, lines.value[end].length)
      }
      break
  }
}

export function handleKey(event: KeyboardEvent) {
  switch (event.key) {
    case 'ArrowLeft':
      moveLeft(event.altKey, event.shiftKey)
      break

    case 'ArrowRight':
      moveRight(event.altKey, event.shiftKey)
      break

    case 'ArrowDown':
      moveDown(event.shiftKey)
      break

    case 'ArrowUp':
      moveUp(event.shiftKey)
      break

    case 'Backspace':
      backspace(event.altKey)
      break

    case 'Enter':
      newline()
      break

    default:
      if (event.metaKey || event.ctrlKey) {
        // Nested if here...
        if (hasActionKey(event)) {
           handleActionKey(event)
        }
        /* handle meta */
      } else if (event.key.length === 1) {
        insert(event.key)
      }

      break
  }
}

const defaultCursorPush = 4
function putCursorAtCoordinates(x: number, y: number) {
  if (lines.value.length <= 0) {
    return
  }

  const { height } = regular.calculate('')

  const lineIndex = Math.floor(y / height)
  const line = Math.min(Math.max(lineIndex, 0), lines.value.length - 1)
  const text = lines.value[line]

  const index = regular.position(text, x, defaultCursorPush)

  putCursor(line, index)
}

export function dropCursor(x: number, y: number) {
  cursor.highlight = null

  putCursorAtCoordinates(x, y)
}

export function dragTo(x: number, y: number) {
  makeSelection()
  putCursorAtCoordinates(x, y)
}
