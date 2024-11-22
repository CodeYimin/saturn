<template>
  <div v-if="find.state.show">
    <div
      v-for="matches in findIndices"
      class="absolute"
      :style="{
        top: `${matches.height}px`,
      }"
    >
      <div
        v-if="!tab()?.hidden.includes(matches.line)"
        v-for="match in matches.matches"
        class="bg-yellow-500 h-6 bg-opacity-30 absolute"
        :class="{ 'bg-opacity-50 bg-orange-500': match === find.state.lastMatch }"
        :style="{
          left: `${match.offset}px`,
          width: `${match.size}px`,
        }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { FindMatch } from '../utils/find'
import { find, storage, tab } from '../state/state'
import { computed } from 'vue'
import { EditorTab } from '../utils/tabs';

const props = withDefaults(
  defineProps<{
    count: number
    start: number
    lineHeight?: number
  }>(),
  { lineHeight: 24 }
)

const findIndices = computed(() => {
  const pairs = [] as { height: number; matches: FindMatch[], line: number }[]

  for (let a = 0; a < props.count; a++) {
    const line = a + props.start

    if (line < 0 || line >= find.state.matches.length) {
      continue
    }

    const matches = find.state.matches[line]
    if (!matches.length) {
      continue
    }

    const numHiddenLines = tab()?.hidden.reduce(
      (prev, curr) => (curr < line ? prev + 1 : prev),
      0,
    ) || 0;

    pairs.push({
      height: props.lineHeight * (line - numHiddenLines),
      line,
      matches,
    })
  }

  return pairs
})
</script>
