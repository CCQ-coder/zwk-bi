<template>
  <div class="designer-table" :style="wrapperStyle">
    <div class="designer-table__scroll">
      <div class="designer-table__header" :style="gridStyle">
        <div v-if="styleConfig.tableShowIndex" class="designer-table__cell designer-table__cell--header designer-table__cell--index">#</div>
        <div
          v-for="column in columns"
          :key="column.id"
          class="designer-table__cell designer-table__cell--header"
          :class="columnAlignClass(column.align)"
          :title="column.label"
        >
          {{ column.label }}
        </div>
      </div>

      <div v-if="rows.length" class="designer-table__body">
        <div
          v-for="(row, rowIndex) in rows"
          :key="rowKey(row, rowIndex)"
          class="designer-table__row"
          :class="rowIndex % 2 === 0 ? 'designer-table__row--odd' : 'designer-table__row--even'"
          :style="gridStyle"
        >
          <div v-if="styleConfig.tableShowIndex" class="designer-table__cell designer-table__cell--index">{{ rowIndex + 1 }}</div>
          <div
            v-for="column in columns"
            :key="column.id"
            class="designer-table__cell"
            :class="columnAlignClass(column.align)"
            :title="formatCell(row[column.field])"
          >
            {{ formatCell(row[column.field]) }}
          </div>
        </div>
      </div>

      <div v-else class="designer-table__empty">暂无数据</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ComponentStyleConfig, TableColumnConfig } from '../utils/component-config'
import { buildTableWrapperStyleVars } from '../utils/component-config'

const props = defineProps<{
  columns: TableColumnConfig[]
  rows: Record<string, unknown>[]
  styleConfig: ComponentStyleConfig
}>()

const wrapperStyle = computed(() => buildTableWrapperStyleVars(props.styleConfig, 'screen'))

const gridTemplateColumns = computed(() => {
  const tracks: string[] = []
  if (props.styleConfig.tableShowIndex) tracks.push('50px')
  props.columns.forEach((column) => {
    tracks.push(`${Math.max(80, Number(column.width) || 120)}px`)
  })
  return tracks.join(' ')
})

const gridStyle = computed(() => ({
  gridTemplateColumns: gridTemplateColumns.value,
}))

const formatCell = (value: unknown) => {
  if (value == null) return ''
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

const rowKey = (row: Record<string, unknown>, rowIndex: number) => {
  const firstColumn = props.columns[0]?.field
  const firstValue = firstColumn ? row[firstColumn] : rowIndex
  return `${rowIndex}-${String(firstValue ?? '')}`
}

const columnAlignClass = (align: TableColumnConfig['align']) => `designer-table__cell--${align || 'left'}`
</script>

<style scoped>
.designer-table {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  border: var(--component-table-border-width) solid var(--component-table-border-color);
  border-radius: 10px;
  background: var(--component-table-odd-row-bg);
  color: var(--component-table-font-color);
  font-size: var(--component-table-font-size);
  contain: layout paint style;
}

/* Shared horizontal scroll container for header + body */
.designer-table__scroll {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow-x: auto;
  overflow-y: hidden;
}

.designer-table__header,
.designer-table__row {
  display: grid;
  min-width: max-content;
}

.designer-table__header {
  background: var(--component-table-header-bg);
  color: var(--component-table-header-color);
  font-size: var(--component-table-header-font-size);
  border-bottom: var(--component-table-border-width) solid var(--component-table-border-color);
}

.designer-table__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}

.designer-table__row {
  min-height: var(--component-table-row-height);
  border-bottom: var(--component-table-border-width) solid var(--component-table-border-color);
}

.designer-table__row--odd {
  background: var(--component-table-odd-row-bg);
}

.designer-table__row--even {
  background: var(--component-table-even-row-bg);
}

.designer-table__cell {
  min-width: 0;
  padding: 0 10px;
  display: flex;
  align-items: center;
  height: var(--component-table-row-height);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  border-right: var(--component-table-border-width) solid var(--component-table-border-color);
}

.designer-table__cell:last-child {
  border-right: none;
}

.designer-table__cell--header {
  font-weight: 600;
  background: var(--component-table-header-bg);
}

.designer-table__cell--index {
  justify-content: center;
}

.designer-table__cell--left {
  justify-content: flex-start;
  text-align: left;
}

.designer-table__cell--center {
  justify-content: center;
  text-align: center;
}

.designer-table__cell--right {
  justify-content: flex-end;
  text-align: right;
}

.designer-table__row--odd > .designer-table__cell {
  background: var(--component-table-odd-row-bg);
}

.designer-table__row--even > .designer-table__cell {
  background: var(--component-table-even-row-bg);
}

.designer-table__empty {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(229, 237, 247, 0.72);
  background: var(--component-table-odd-row-bg);
}
</style>