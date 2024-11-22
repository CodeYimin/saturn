import { useSettings } from '../utils/settings'
import { useCursor } from '../utils/cursor'
import { SelectionIndex } from '../utils/editor'
import { useHighlights } from '../utils/highlights'
import { regular } from '../utils/query/text-size'
import { useStorage } from '../utils/storage'
import { useFind } from '../utils/find'
import { useSuggestions } from '../utils/suggestions'
import { CursorState, useTabs } from '../utils/tabs'
import { GotoMessage, useGoto } from '../utils/goto'
import { useSymbolHighlight } from '../utils/symbol-highlight'
import { ref, watch } from 'vue'
import { InstructionLine } from '../utils/mips/mips'

export const settings = useSettings()

function widthQuery(text: string) {
  return regular.calculate(text).width
}

export const {
  tabsState,
  tab,
  tabBody,
  createTab,
  closeTab,
  loadElf,
  saveModal,
  backup,
  showSettings,
} = useTabs()

export const find = useFind(() => tabBody.value, widthQuery)

export const errorHighlights = useHighlights(widthQuery)
export const gotoHighlights = useHighlights<GotoMessage>(widthQuery)

function cursorState(): CursorState {
  return tab()?.cursor ?? { line: 0, index: 0, highlight: null }
}

function cursorIndex(): SelectionIndex {
  const state = cursorState()

  return { line: state.line, index: state.index }
}


const storageResult = useStorage(errorHighlights, tab, onDirty)

export const { editor, storage, suggestionsStorage } = storageResult

export const {
  updateCursor: updateCursorSymbol,
  highlights: symbolHighlights
} = useSymbolHighlight(storageResult, widthQuery)

function onDirty(line: number, deleted: number, insert: string[]) {
  const linesAdded = insert.length - deleted

  if (tab() && (line !== 0 || tab()!.cursor.highlight)) {
    if (linesAdded < 0) {
      // Watch for deleting an entire hidden range
      const linesEdited = Array.from({ length: deleted }, (_, i) => line + i)
      tab()!.hiddenRanges = tab()!.hiddenRanges.filter(
        ({ start, end, enabled }) =>
          linesEdited.every((line) => start > line || line > end),
      )
    } else {
      // Otherwise modifying a line
      tab()!.hiddenRanges = tab()!.hiddenRanges.filter(
        ({ start, end, enabled }) => start > line || line > end,
      )
    }
  }

  // Correct for hidden ranges when adding/deleting a line
  if (tab()) {
    tab()!.hiddenRanges = tab()!.hiddenRanges.map(
      ({ start, end, enabled }) => ({
        start: start > line ? start + linesAdded : start,
        end: start > line ? end + linesAdded : end,
        enabled,
      }),
    )
  }

  find.dirty(line, deleted, insert)
  gotoHighlights.shiftHighlight(line, deleted, insert.length)
  updateCursorSymbol(cursorState())
}

watch(() => {
  const cursor = cursorIndex()
  const line = tab()?.lines[cursor.line]

  const index = line ? Math.min(line.length, cursor.index) : cursor.index

  return { line: cursor.line, index }
}, updateCursorSymbol)

export const goto = useGoto(gotoHighlights, storageResult)

export const suggestions = useSuggestions(
  () => storage.language,
  suggestionsStorage
)

function showSuggestionsAt(cursor: SelectionIndex) {
  const highlights = storage.highlights[cursor.line]

  if (highlights) {
    suggestions.showSuggestions(storage.highlights[cursor.line], cursor.index)
  }
}

export const showExportRegionsDialog = ref(false)

export const {
  range,
  position,
  jump,
  lineStart,
  getSelection,
  dropSelection,
  pasteText,
  dropCursor,
  dragTo,
  cursorCoordinates,
  handleKey,
  applyMergeSuggestion,
} = useCursor(
  () => editor.value,
  cursorState,
  settings.editor,
  regular,
  24,
  suggestions,
  showSuggestionsAt
)

export const buildLines = ref(null as InstructionLine[] | null)
