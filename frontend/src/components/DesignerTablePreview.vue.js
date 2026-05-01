import { computed } from 'vue';
import { buildTableWrapperStyleVars } from '../utils/component-config';
const props = defineProps();
const wrapperStyle = computed(() => buildTableWrapperStyleVars(props.styleConfig, 'screen'));
const gridTemplateColumns = computed(() => {
    const tracks = [];
    if (props.styleConfig.tableShowIndex)
        tracks.push('50px');
    props.columns.forEach((column) => {
        tracks.push(`${Math.max(80, Number(column.width) || 120)}px`);
    });
    return tracks.join(' ');
});
const gridStyle = computed(() => ({
    gridTemplateColumns: gridTemplateColumns.value,
}));
const formatCell = (value) => {
    if (value == null)
        return '';
    if (typeof value === 'object')
        return JSON.stringify(value);
    return String(value);
};
const rowKey = (row, rowIndex) => {
    const firstColumn = props.columns[0]?.field;
    const firstValue = firstColumn ? row[firstColumn] : rowIndex;
    return `${rowIndex}-${String(firstValue ?? '')}`;
};
const columnAlignClass = (align) => `designer-table__cell--${align || 'left'}`;
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['designer-table__header']} */ ;
/** @type {__VLS_StyleScopedClasses['designer-table__row']} */ ;
/** @type {__VLS_StyleScopedClasses['designer-table__cell']} */ ;
/** @type {__VLS_StyleScopedClasses['designer-table__row--odd']} */ ;
/** @type {__VLS_StyleScopedClasses['designer-table__cell']} */ ;
/** @type {__VLS_StyleScopedClasses['designer-table__row--even']} */ ;
/** @type {__VLS_StyleScopedClasses['designer-table__cell']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "designer-table" },
    ...{ style: (__VLS_ctx.wrapperStyle) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "designer-table__scroll" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "designer-table__header" },
    ...{ style: (__VLS_ctx.gridStyle) },
});
if (__VLS_ctx.styleConfig.tableShowIndex) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "designer-table__cell designer-table__cell--header designer-table__cell--index" },
    });
}
for (const [column] of __VLS_getVForSourceType((__VLS_ctx.columns))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        key: (column.id),
        ...{ class: "designer-table__cell designer-table__cell--header" },
        ...{ class: (__VLS_ctx.columnAlignClass(column.align)) },
        title: (column.label),
    });
    (column.label);
}
if (__VLS_ctx.rows.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "designer-table__body" },
    });
    for (const [row, rowIndex] of __VLS_getVForSourceType((__VLS_ctx.rows))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (__VLS_ctx.rowKey(row, rowIndex)),
            ...{ class: "designer-table__row" },
            ...{ class: (rowIndex % 2 === 0 ? 'designer-table__row--odd' : 'designer-table__row--even') },
            ...{ style: (__VLS_ctx.gridStyle) },
        });
        if (__VLS_ctx.styleConfig.tableShowIndex) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "designer-table__cell designer-table__cell--index" },
            });
            (rowIndex + 1);
        }
        for (const [column] of __VLS_getVForSourceType((__VLS_ctx.columns))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (column.id),
                ...{ class: "designer-table__cell" },
                ...{ class: (__VLS_ctx.columnAlignClass(column.align)) },
                title: (__VLS_ctx.formatCell(row[column.field])),
            });
            (__VLS_ctx.formatCell(row[column.field]));
        }
    }
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "designer-table__empty" },
    });
}
/** @type {__VLS_StyleScopedClasses['designer-table']} */ ;
/** @type {__VLS_StyleScopedClasses['designer-table__scroll']} */ ;
/** @type {__VLS_StyleScopedClasses['designer-table__header']} */ ;
/** @type {__VLS_StyleScopedClasses['designer-table__cell']} */ ;
/** @type {__VLS_StyleScopedClasses['designer-table__cell--header']} */ ;
/** @type {__VLS_StyleScopedClasses['designer-table__cell--index']} */ ;
/** @type {__VLS_StyleScopedClasses['designer-table__cell']} */ ;
/** @type {__VLS_StyleScopedClasses['designer-table__cell--header']} */ ;
/** @type {__VLS_StyleScopedClasses['designer-table__body']} */ ;
/** @type {__VLS_StyleScopedClasses['designer-table__row']} */ ;
/** @type {__VLS_StyleScopedClasses['designer-table__cell']} */ ;
/** @type {__VLS_StyleScopedClasses['designer-table__cell--index']} */ ;
/** @type {__VLS_StyleScopedClasses['designer-table__cell']} */ ;
/** @type {__VLS_StyleScopedClasses['designer-table__empty']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            wrapperStyle: wrapperStyle,
            gridStyle: gridStyle,
            formatCell: formatCell,
            rowKey: rowKey,
            columnAlignClass: columnAlignClass,
        };
    },
    __typeProps: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeProps: {},
});
; /* PartiallyEnd: #4569/main.vue */
