<template>
  <div v-if="find.state.show" class="py-2 h-12 relative w-full block shrink-0">
    <div
      class="flex items-center h-12 border-b border-neutral-700 dark:bg-neutral-900 bg-neutral-200 w-full absolute top-0 z-30"
    >
      <label for="find" class="text-xs font-bold px-4 py-2">Find</label>
      <input
        id="find"
        ref="findInput"
        type="text"
        autocomplete="off"
        spellcheck="false"
        @keydown.enter="jumpToNext()"
        @keydown.esc.prevent="close()"
        class="text-xs font-mono dark:bg-neutral-800 bg-neutral-300 dark:text-neutral-300 text-neutral-700 px-2 py-1 w-64 rounded"
        v-model="find.state.text"
      />

      <div class="flex px-2 space-x-1">
        <button class="p-1 rounded dark:hover:bg-neutral-700 hover:bg-neutral-300" @click="jumpToPrev()">
          <ArrowUpIcon class="w-4 h-4" />
        </button>
        <button class="p-1 rounded dark:hover:bg-neutral-700 hover:bg-neutral-300" @click="jumpToNext()">
          <ArrowDownIcon class="w-4 h-4" />
        </button>
      </div>

      <div class="text-neutral-600 text-sm">{{ currentIndex + 1 }} / {{ matches.length }} matches</div>

      <button
        class="w-12 h-12 ml-auto dark:hover:bg-slate-800 hover:bg-slate-300 dark:text-slate-300 text-slate-800 shrink-0 flex items-center justify-center"
        @click="close()"
      >
        <XMarkIcon class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ArrowUpIcon, ArrowDownIcon, XMarkIcon } from '@heroicons/vue/24/solid'
import { find, jump, tab } from '../state/state'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

let currentIndex = ref<number>(-1);

// Flatten the matches into an array of {line, index} objects
const matches = computed(() => {
  return find.state.matches.flatMap((matches, line) => matches.map((match) => ({line: line, originalMatch: match})))
})

function jumpToNext() {
  if (!matches.value.length) {
    return
  }

  if (currentIndex.value === matches.value.length - 1) {
    currentIndex.value = 0
  } else {
    currentIndex.value++;
  }

  const nextMatch = matches.value[currentIndex.value]

  find.state.lastMatch = nextMatch.originalMatch
  // console.log("Jump", nextMatch.line, nextMatch.originalMatch.index)
  jump({line: nextMatch.line, index: nextMatch.originalMatch.index});
}

function jumpToPrev() {
  if (!matches.value.length) {
    return
  }

  if (currentIndex.value === 0) {
    currentIndex.value = matches.value.length - 1
  } else {
    currentIndex.value--;
  }

  const prevMatch = matches.value[currentIndex.value]

  find.state.lastMatch = prevMatch.originalMatch
  jump({line: prevMatch.line, index: prevMatch.originalMatch.index});
}

const findInput = ref(null as HTMLInputElement | null)

let needsFocus = false

function close() {
  find.state.show = false
}

function queueFocus() {
  if (findInput.value) {
    findInput.value.focus()
    findInput.value.select()
    needsFocus = false
  } else {
    needsFocus = true
  }
}

const listenEscape = (event: KeyboardEvent) => {
  if (event.key == 'Escape') {
    find.state.show = false
  }
}

onMounted(() => {
  window.addEventListener('keydown', listenEscape)
})

onUnmounted(() => {
  window.removeEventListener('keydown', listenEscape)
})

watch(
  () => find.state.show,
  (value, old) => {
    if (value && !old) {
      queueFocus()
    }
  }
)

watch(
  () => find.state.focus,
  (value) => {
    if (value) {
      queueFocus()
      find.state.focus = false
    }
  }
)

watch(
  () => findInput.value,
  (value) => {
    if (needsFocus) {
      queueFocus()
    }
  }
)

watch(
  () => matches.value,
  (value) => {
    currentIndex.value = -1
    if (value.length > 0) {
      jumpToNext()
    }
  }
)
</script>
