import { onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { getDatasourceList, getDatasourceTables, previewExtract } from '../api/datasource';
const datasources = ref([]);
const tables = ref([]);
const previewLoading = ref(false);
const form = reactive({
    datasourceId: null,
    tableName: '',
    whereClause: '',
    limit: 20
});
const preview = reactive({
    sqlText: '',
    columns: [],
    rows: [],
    rowCount: 0
});
const loadDatasources = async () => {
    datasources.value = await getDatasourceList();
};
const onDatasourceChange = async (id) => {
    form.tableName = '';
    tables.value = [];
    if (!id)
        return;
    tables.value = await getDatasourceTables(id);
};
const handlePreview = async () => {
    if (!form.datasourceId)
        return ElMessage.warning('请选择数据源');
    if (!form.tableName)
        return ElMessage.warning('请选择源表');
    previewLoading.value = true;
    try {
        const result = await previewExtract({
            datasourceId: form.datasourceId,
            tableName: form.tableName,
            whereClause: form.whereClause || undefined,
            limit: form.limit
        });
        Object.assign(preview, result);
        ElMessage.success('抽取预览成功');
    }
    finally {
        previewLoading.value = false;
    }
};
onMounted(loadDatasources);
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['sql-box']} */ ;
// CSS variable injection 
// CSS variable injection end 
const __VLS_0 = {}.ElCard;
/** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ class: "extract-page" },
}));
const __VLS_2 = __VLS_1({
    ...{ class: "extract-page" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
var __VLS_4 = {};
__VLS_3.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "extract-toolbar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
    ...{ class: "extract-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "extract-tip" },
});
const __VLS_5 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_6 = __VLS_asFunctionalComponent(__VLS_5, new __VLS_5({
    model: (__VLS_ctx.form),
    labelWidth: "100px",
    ...{ class: "extract-form" },
    inline: true,
}));
const __VLS_7 = __VLS_6({
    model: (__VLS_ctx.form),
    labelWidth: "100px",
    ...{ class: "extract-form" },
    inline: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_6));
__VLS_8.slots.default;
const __VLS_9 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_10 = __VLS_asFunctionalComponent(__VLS_9, new __VLS_9({
    label: "数据源",
    required: true,
}));
const __VLS_11 = __VLS_10({
    label: "数据源",
    required: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_10));
__VLS_12.slots.default;
const __VLS_13 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_14 = __VLS_asFunctionalComponent(__VLS_13, new __VLS_13({
    ...{ 'onChange': {} },
    modelValue: (__VLS_ctx.form.datasourceId),
    placeholder: "请选择数据源",
    ...{ style: {} },
}));
const __VLS_15 = __VLS_14({
    ...{ 'onChange': {} },
    modelValue: (__VLS_ctx.form.datasourceId),
    placeholder: "请选择数据源",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_14));
let __VLS_17;
let __VLS_18;
let __VLS_19;
const __VLS_20 = {
    onChange: (__VLS_ctx.onDatasourceChange)
};
__VLS_16.slots.default;
for (const [d] of __VLS_getVForSourceType((__VLS_ctx.datasources))) {
    const __VLS_21 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_22 = __VLS_asFunctionalComponent(__VLS_21, new __VLS_21({
        key: (d.id),
        label: (`${d.name} (${d.connectMode})`),
        value: (d.id),
    }));
    const __VLS_23 = __VLS_22({
        key: (d.id),
        label: (`${d.name} (${d.connectMode})`),
        value: (d.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_22));
}
var __VLS_16;
var __VLS_12;
const __VLS_25 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_26 = __VLS_asFunctionalComponent(__VLS_25, new __VLS_25({
    label: "源表",
    required: true,
}));
const __VLS_27 = __VLS_26({
    label: "源表",
    required: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_26));
__VLS_28.slots.default;
const __VLS_29 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_30 = __VLS_asFunctionalComponent(__VLS_29, new __VLS_29({
    modelValue: (__VLS_ctx.form.tableName),
    filterable: true,
    placeholder: "请选择源表",
    ...{ style: {} },
    disabled: (!__VLS_ctx.form.datasourceId),
}));
const __VLS_31 = __VLS_30({
    modelValue: (__VLS_ctx.form.tableName),
    filterable: true,
    placeholder: "请选择源表",
    ...{ style: {} },
    disabled: (!__VLS_ctx.form.datasourceId),
}, ...__VLS_functionalComponentArgsRest(__VLS_30));
__VLS_32.slots.default;
for (const [t] of __VLS_getVForSourceType((__VLS_ctx.tables))) {
    const __VLS_33 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_34 = __VLS_asFunctionalComponent(__VLS_33, new __VLS_33({
        key: (t.tableName),
        label: (t.tableName),
        value: (t.tableName),
    }));
    const __VLS_35 = __VLS_34({
        key: (t.tableName),
        label: (t.tableName),
        value: (t.tableName),
    }, ...__VLS_functionalComponentArgsRest(__VLS_34));
}
var __VLS_32;
var __VLS_28;
const __VLS_37 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_38 = __VLS_asFunctionalComponent(__VLS_37, new __VLS_37({
    label: "抽取行数",
}));
const __VLS_39 = __VLS_38({
    label: "抽取行数",
}, ...__VLS_functionalComponentArgsRest(__VLS_38));
__VLS_40.slots.default;
const __VLS_41 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_42 = __VLS_asFunctionalComponent(__VLS_41, new __VLS_41({
    modelValue: (__VLS_ctx.form.limit),
    min: (1),
    max: (500),
    ...{ style: {} },
}));
const __VLS_43 = __VLS_42({
    modelValue: (__VLS_ctx.form.limit),
    min: (1),
    max: (500),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_42));
var __VLS_40;
const __VLS_45 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_46 = __VLS_asFunctionalComponent(__VLS_45, new __VLS_45({}));
const __VLS_47 = __VLS_46({}, ...__VLS_functionalComponentArgsRest(__VLS_46));
__VLS_48.slots.default;
const __VLS_49 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_50 = __VLS_asFunctionalComponent(__VLS_49, new __VLS_49({
    ...{ 'onClick': {} },
    type: "primary",
    loading: (__VLS_ctx.previewLoading),
}));
const __VLS_51 = __VLS_50({
    ...{ 'onClick': {} },
    type: "primary",
    loading: (__VLS_ctx.previewLoading),
}, ...__VLS_functionalComponentArgsRest(__VLS_50));
let __VLS_53;
let __VLS_54;
let __VLS_55;
const __VLS_56 = {
    onClick: (__VLS_ctx.handlePreview)
};
__VLS_52.slots.default;
var __VLS_52;
var __VLS_48;
var __VLS_8;
const __VLS_57 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_58 = __VLS_asFunctionalComponent(__VLS_57, new __VLS_57({
    model: (__VLS_ctx.form),
    labelWidth: "100px",
    ...{ style: {} },
}));
const __VLS_59 = __VLS_58({
    model: (__VLS_ctx.form),
    labelWidth: "100px",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_58));
__VLS_60.slots.default;
const __VLS_61 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_62 = __VLS_asFunctionalComponent(__VLS_61, new __VLS_61({
    label: "筛选条件",
}));
const __VLS_63 = __VLS_62({
    label: "筛选条件",
}, ...__VLS_functionalComponentArgsRest(__VLS_62));
__VLS_64.slots.default;
const __VLS_65 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_66 = __VLS_asFunctionalComponent(__VLS_65, new __VLS_65({
    modelValue: (__VLS_ctx.form.whereClause),
    type: "textarea",
    rows: (2),
    placeholder: "可选，例如：order_date >= '2026-01-01' AND status = 'PAID'",
}));
const __VLS_67 = __VLS_66({
    modelValue: (__VLS_ctx.form.whereClause),
    type: "textarea",
    rows: (2),
    placeholder: "可选，例如：order_date >= '2026-01-01' AND status = 'PAID'",
}, ...__VLS_functionalComponentArgsRest(__VLS_66));
var __VLS_64;
var __VLS_60;
if (__VLS_ctx.preview.sqlText) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "sql-box" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "sql-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.pre, __VLS_intrinsicElements.pre)({});
    (__VLS_ctx.preview.sqlText);
}
const __VLS_69 = {}.ElTable;
/** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
// @ts-ignore
const __VLS_70 = __VLS_asFunctionalComponent(__VLS_69, new __VLS_69({
    data: (__VLS_ctx.preview.rows),
    border: true,
    maxHeight: "520",
    ...{ style: {} },
}));
const __VLS_71 = __VLS_70({
    data: (__VLS_ctx.preview.rows),
    border: true,
    maxHeight: "520",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_70));
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.previewLoading) }, null, null);
__VLS_72.slots.default;
for (const [col] of __VLS_getVForSourceType((__VLS_ctx.preview.columns))) {
    const __VLS_73 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_74 = __VLS_asFunctionalComponent(__VLS_73, new __VLS_73({
        key: (col),
        prop: (col),
        label: (col),
        minWidth: "140",
        showOverflowTooltip: true,
    }));
    const __VLS_75 = __VLS_74({
        key: (col),
        prop: (col),
        label: (col),
        minWidth: "140",
        showOverflowTooltip: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_74));
}
var __VLS_72;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "extract-foot" },
});
(__VLS_ctx.preview.rowCount);
var __VLS_3;
/** @type {__VLS_StyleScopedClasses['extract-page']} */ ;
/** @type {__VLS_StyleScopedClasses['extract-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['extract-title']} */ ;
/** @type {__VLS_StyleScopedClasses['extract-tip']} */ ;
/** @type {__VLS_StyleScopedClasses['extract-form']} */ ;
/** @type {__VLS_StyleScopedClasses['sql-box']} */ ;
/** @type {__VLS_StyleScopedClasses['sql-title']} */ ;
/** @type {__VLS_StyleScopedClasses['extract-foot']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            datasources: datasources,
            tables: tables,
            previewLoading: previewLoading,
            form: form,
            preview: preview,
            onDatasourceChange: onDatasourceChange,
            handlePreview: handlePreview,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
