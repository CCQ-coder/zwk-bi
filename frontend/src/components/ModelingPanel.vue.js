/// <reference types="../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { computed, defineComponent, onMounted, reactive, ref } from 'vue';
import { ElButton, ElInput, ElMessage, ElOption, ElSelect, ElTable, ElTableColumn } from 'element-plus';
import { DataAnalysis, Edit, Plus } from '@element-plus/icons-vue';
import { createModel, deleteModel, getModelList, updateModel } from '../api/model';
// ─── Sub-components (inline for simplicity) ──────────────────────────────────
const ModelJoinConfig = defineComponent({
    components: { ElButton, ElInput, ElOption, ElSelect, ElTable, ElTableColumn },
    props: { configJson: String },
    emits: ['save'],
    setup(props, { emit }) {
        const config = computed(() => {
            try {
                return JSON.parse(props.configJson || '{}');
            }
            catch {
                return {};
            }
        });
        const joins = ref(config.value.joins ?? []);
        const addJoin = () => joins.value.push({ leftTable: '', rightTable: '', leftField: '', rightField: '', joinType: 'LEFT' });
        const removeJoin = (i) => joins.value.splice(i, 1);
        const save = () => emit('save', JSON.stringify({ ...config.value, joins: joins.value }));
        return { joins, addJoin, removeJoin, save };
    },
    template: `
    <div>
      <div style="margin-bottom:12px;display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:13px;color:#606266">配置表之间的关联关系（JOIN）</span>
        <el-button size="small" type="primary" @click="addJoin">添加关联</el-button>
      </div>
      <el-table :data="joins" border size="small">
        <el-table-column label="左表" min-width="120">
          <template #default="{row}"><el-input v-model="row.leftTable" size="small" /></template>
        </el-table-column>
        <el-table-column label="左字段" min-width="120">
          <template #default="{row}"><el-input v-model="row.leftField" size="small" /></template>
        </el-table-column>
        <el-table-column label="JOIN类型" width="120">
          <template #default="{row}">
            <el-select v-model="row.joinType" size="small">
              <el-option value="INNER" label="INNER JOIN" />
              <el-option value="LEFT" label="LEFT JOIN" />
              <el-option value="RIGHT" label="RIGHT JOIN" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="右表" min-width="120">
          <template #default="{row}"><el-input v-model="row.rightTable" size="small" /></template>
        </el-table-column>
        <el-table-column label="右字段" min-width="120">
          <template #default="{row}"><el-input v-model="row.rightField" size="small" /></template>
        </el-table-column>
        <el-table-column label="操作" width="70">
          <template #default="{$index}">
            <el-button link type="danger" @click="removeJoin($index)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div style="margin-top:12px;text-align:right">
        <el-button type="primary" size="small" @click="save">保存配置</el-button>
      </div>
    </div>`
});
const ModelCalcFields = defineComponent({
    components: { ElButton, ElInput, ElOption, ElSelect, ElTable, ElTableColumn },
    props: { configJson: String },
    emits: ['save'],
    setup(props, { emit }) {
        const config = computed(() => {
            try {
                return JSON.parse(props.configJson || '{}');
            }
            catch {
                return {};
            }
        });
        const fields = ref(config.value.calcFields ?? []);
        const addField = () => fields.value.push({ fieldName: '', expression: '', fieldType: 'MEASURE' });
        const removeField = (i) => fields.value.splice(i, 1);
        const save = () => emit('save', JSON.stringify({ ...config.value, calcFields: fields.value }));
        return { fields, addField, removeField, save };
    },
    template: `
    <div>
      <div style="margin-bottom:12px;display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:13px;color:#606266">定义计算字段（SQL 表达式）</span>
        <el-button size="small" type="primary" @click="addField">添加计算字段</el-button>
      </div>
      <el-table :data="fields" border size="small">
        <el-table-column label="字段名" width="160">
          <template #default="{row}"><el-input v-model="row.fieldName" size="small" placeholder="如 profit" /></template>
        </el-table-column>
        <el-table-column label="表达式" min-width="220">
          <template #default="{row}"><el-input v-model="row.expression" size="small" placeholder="如 price * quantity" /></template>
        </el-table-column>
        <el-table-column label="类型" width="130">
          <template #default="{row}">
            <el-select v-model="row.fieldType" size="small">
              <el-option value="MEASURE" label="度量（数值）" />
              <el-option value="DIMENSION" label="维度（分类）" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="70">
          <template #default="{$index}">
            <el-button link type="danger" @click="removeField($index)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div style="margin-top:12px;text-align:right">
        <el-button type="primary" size="small" @click="save">保存配置</el-button>
      </div>
    </div>`
});
// ─── Main panel ───────────────────────────────────────────────────────────────
const rows = ref([]);
const loading = ref(false);
const sideSearch = ref('');
const selectedId = ref(null);
const selected = computed(() => rows.value.find((r) => r.id === selectedId.value) ?? null);
const filteredRows = computed(() => rows.value.filter((r) => !sideSearch.value || r.name.toLowerCase().includes(sideSearch.value.toLowerCase())));
const loadList = async () => {
    loading.value = true;
    try {
        rows.value = await getModelList();
        if (!selectedId.value && rows.value.length)
            selectedId.value = rows.value[0].id;
    }
    finally {
        loading.value = false;
    }
};
const saveConfig = async (id, json) => {
    const row = rows.value.find((r) => r.id === id);
    if (!row)
        return;
    await updateModel(id, { name: row.name, description: row.description, configJson: json });
    ElMessage.success('配置已保存');
    await loadList();
};
// ─── Create / Edit ─────────────────────────────────────────────────────────────
const dialogVisible = ref(false);
const saving = ref(false);
const editId = ref(null);
const formRef = ref();
const emptyForm = () => ({ name: '', description: '', configJson: '{}' });
const form = reactive(emptyForm());
const rules = { name: [{ required: true, message: '请输入名称', trigger: 'blur' }] };
const openCreate = () => { editId.value = null; Object.assign(form, emptyForm()); dialogVisible.value = true; };
const openEdit = (row) => {
    editId.value = row.id;
    form.name = row.name;
    form.description = row.description;
    form.configJson = row.configJson;
    dialogVisible.value = true;
};
const handleSubmit = async () => {
    await formRef.value?.validate();
    saving.value = true;
    try {
        if (editId.value) {
            await updateModel(editId.value, form);
            ElMessage.success('更新成功');
        }
        else {
            const created = await createModel(form);
            ElMessage.success('创建成功');
            selectedId.value = created.id;
        }
        dialogVisible.value = false;
        await loadList();
    }
    finally {
        saving.value = false;
    }
};
const handleDelete = async (id) => {
    await deleteModel(id);
    ElMessage.success('删除成功');
    if (selectedId.value === id)
        selectedId.value = null;
    await loadList();
};
onMounted(loadList);
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['model-list-item']} */ ;
/** @type {__VLS_StyleScopedClasses['model-list-item']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "model-layout" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
    ...{ class: "model-sidebar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "model-sidebar-toolbar" },
});
const __VLS_0 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    modelValue: (__VLS_ctx.sideSearch),
    size: "small",
    placeholder: "搜索",
    clearable: true,
    ...{ style: {} },
}));
const __VLS_2 = __VLS_1({
    modelValue: (__VLS_ctx.sideSearch),
    size: "small",
    placeholder: "搜索",
    clearable: true,
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
const __VLS_4 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
    ...{ 'onClick': {} },
    type: "primary",
    size: "small",
    icon: (__VLS_ctx.Plus),
    ...{ style: {} },
}));
const __VLS_6 = __VLS_5({
    ...{ 'onClick': {} },
    type: "primary",
    size: "small",
    icon: (__VLS_ctx.Plus),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
let __VLS_8;
let __VLS_9;
let __VLS_10;
const __VLS_11 = {
    onClick: (__VLS_ctx.openCreate)
};
var __VLS_7;
const __VLS_12 = {}.ElScrollbar;
/** @type {[typeof __VLS_components.ElScrollbar, typeof __VLS_components.elScrollbar, typeof __VLS_components.ElScrollbar, typeof __VLS_components.elScrollbar, ]} */ ;
// @ts-ignore
const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({}));
const __VLS_14 = __VLS_13({}, ...__VLS_functionalComponentArgsRest(__VLS_13));
__VLS_15.slots.default;
for (const [row] of __VLS_getVForSourceType((__VLS_ctx.filteredRows))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.selectedId = row.id;
            } },
        key: (row.id),
        ...{ class: "model-list-item" },
        ...{ class: ({ active: __VLS_ctx.selectedId === row.id }) },
    });
    const __VLS_16 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({}));
    const __VLS_18 = __VLS_17({}, ...__VLS_functionalComponentArgsRest(__VLS_17));
    __VLS_19.slots.default;
    const __VLS_20 = {}.DataAnalysis;
    /** @type {[typeof __VLS_components.DataAnalysis, ]} */ ;
    // @ts-ignore
    const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({}));
    const __VLS_22 = __VLS_21({}, ...__VLS_functionalComponentArgsRest(__VLS_21));
    var __VLS_19;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "model-item-name" },
        title: (row.name),
    });
    (row.name);
}
if (__VLS_ctx.filteredRows.length === 0 && !__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "model-empty" },
    });
}
var __VLS_15;
__VLS_asFunctionalElement(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)({
    ...{ class: "model-main" },
});
if (!__VLS_ctx.selected) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "model-empty-main" },
    });
    const __VLS_24 = {}.ElEmpty;
    /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
    // @ts-ignore
    const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
        description: "请在左侧选择或新建数据模型",
    }));
    const __VLS_26 = __VLS_25({
        description: "请在左侧选择或新建数据模型",
    }, ...__VLS_functionalComponentArgsRest(__VLS_25));
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "model-detail-header" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "model-detail-title" },
    });
    (__VLS_ctx.selected.name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "model-detail-actions" },
    });
    const __VLS_28 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Edit),
    }));
    const __VLS_30 = __VLS_29({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Edit),
    }, ...__VLS_functionalComponentArgsRest(__VLS_29));
    let __VLS_32;
    let __VLS_33;
    let __VLS_34;
    const __VLS_35 = {
        onClick: (...[$event]) => {
            if (!!(!__VLS_ctx.selected))
                return;
            __VLS_ctx.openEdit(__VLS_ctx.selected);
        }
    };
    __VLS_31.slots.default;
    var __VLS_31;
    const __VLS_36 = {}.ElPopconfirm;
    /** @type {[typeof __VLS_components.ElPopconfirm, typeof __VLS_components.elPopconfirm, typeof __VLS_components.ElPopconfirm, typeof __VLS_components.elPopconfirm, ]} */ ;
    // @ts-ignore
    const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
        ...{ 'onConfirm': {} },
        title: "确认删除该数据模型？",
    }));
    const __VLS_38 = __VLS_37({
        ...{ 'onConfirm': {} },
        title: "确认删除该数据模型？",
    }, ...__VLS_functionalComponentArgsRest(__VLS_37));
    let __VLS_40;
    let __VLS_41;
    let __VLS_42;
    const __VLS_43 = {
        onConfirm: (...[$event]) => {
            if (!!(!__VLS_ctx.selected))
                return;
            __VLS_ctx.handleDelete(__VLS_ctx.selected.id);
        }
    };
    __VLS_39.slots.default;
    {
        const { reference: __VLS_thisSlot } = __VLS_39.slots;
        const __VLS_44 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
            size: "small",
            type: "danger",
            plain: true,
        }));
        const __VLS_46 = __VLS_45({
            size: "small",
            type: "danger",
            plain: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_45));
        __VLS_47.slots.default;
        var __VLS_47;
    }
    var __VLS_39;
    const __VLS_48 = {}.ElTabs;
    /** @type {[typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, ]} */ ;
    // @ts-ignore
    const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
        ...{ class: "model-tabs" },
    }));
    const __VLS_50 = __VLS_49({
        ...{ class: "model-tabs" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_49));
    __VLS_51.slots.default;
    const __VLS_52 = {}.ElTabPane;
    /** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
    // @ts-ignore
    const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
        label: "基础信息",
        name: "info",
    }));
    const __VLS_54 = __VLS_53({
        label: "基础信息",
        name: "info",
    }, ...__VLS_functionalComponentArgsRest(__VLS_53));
    __VLS_55.slots.default;
    const __VLS_56 = {}.ElDescriptions;
    /** @type {[typeof __VLS_components.ElDescriptions, typeof __VLS_components.elDescriptions, typeof __VLS_components.ElDescriptions, typeof __VLS_components.elDescriptions, ]} */ ;
    // @ts-ignore
    const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
        border: true,
        column: (2),
        size: "small",
        ...{ style: {} },
    }));
    const __VLS_58 = __VLS_57({
        border: true,
        column: (2),
        size: "small",
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_57));
    __VLS_59.slots.default;
    const __VLS_60 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
        label: "名称",
    }));
    const __VLS_62 = __VLS_61({
        label: "名称",
    }, ...__VLS_functionalComponentArgsRest(__VLS_61));
    __VLS_63.slots.default;
    (__VLS_ctx.selected.name);
    var __VLS_63;
    const __VLS_64 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
        label: "描述",
    }));
    const __VLS_66 = __VLS_65({
        label: "描述",
    }, ...__VLS_functionalComponentArgsRest(__VLS_65));
    __VLS_67.slots.default;
    (__VLS_ctx.selected.description || '—');
    var __VLS_67;
    const __VLS_68 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
        label: "创建时间",
    }));
    const __VLS_70 = __VLS_69({
        label: "创建时间",
    }, ...__VLS_functionalComponentArgsRest(__VLS_69));
    __VLS_71.slots.default;
    (__VLS_ctx.selected.createdAt);
    var __VLS_71;
    var __VLS_59;
    var __VLS_55;
    const __VLS_72 = {}.ElTabPane;
    /** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
    // @ts-ignore
    const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
        label: "表关联配置",
        name: "joins",
    }));
    const __VLS_74 = __VLS_73({
        label: "表关联配置",
        name: "joins",
    }, ...__VLS_functionalComponentArgsRest(__VLS_73));
    __VLS_75.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "model-config-section" },
    });
    const __VLS_76 = {}.ModelJoinConfig;
    /** @type {[typeof __VLS_components.ModelJoinConfig, ]} */ ;
    // @ts-ignore
    const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({
        ...{ 'onSave': {} },
        configJson: (__VLS_ctx.selected.configJson),
    }));
    const __VLS_78 = __VLS_77({
        ...{ 'onSave': {} },
        configJson: (__VLS_ctx.selected.configJson),
    }, ...__VLS_functionalComponentArgsRest(__VLS_77));
    let __VLS_80;
    let __VLS_81;
    let __VLS_82;
    const __VLS_83 = {
        onSave: ((json) => __VLS_ctx.saveConfig(__VLS_ctx.selected.id, json))
    };
    var __VLS_79;
    var __VLS_75;
    const __VLS_84 = {}.ElTabPane;
    /** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
    // @ts-ignore
    const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({
        label: "计算字段",
        name: "fields",
    }));
    const __VLS_86 = __VLS_85({
        label: "计算字段",
        name: "fields",
    }, ...__VLS_functionalComponentArgsRest(__VLS_85));
    __VLS_87.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "model-config-section" },
    });
    const __VLS_88 = {}.ModelCalcFields;
    /** @type {[typeof __VLS_components.ModelCalcFields, ]} */ ;
    // @ts-ignore
    const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({
        ...{ 'onSave': {} },
        configJson: (__VLS_ctx.selected.configJson),
    }));
    const __VLS_90 = __VLS_89({
        ...{ 'onSave': {} },
        configJson: (__VLS_ctx.selected.configJson),
    }, ...__VLS_functionalComponentArgsRest(__VLS_89));
    let __VLS_92;
    let __VLS_93;
    let __VLS_94;
    const __VLS_95 = {
        onSave: ((json) => __VLS_ctx.saveConfig(__VLS_ctx.selected.id, json))
    };
    var __VLS_91;
    var __VLS_87;
    var __VLS_51;
}
const __VLS_96 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_97 = __VLS_asFunctionalComponent(__VLS_96, new __VLS_96({
    modelValue: (__VLS_ctx.dialogVisible),
    title: (__VLS_ctx.editId ? '编辑数据模型' : '新建数据模型'),
    width: "500px",
    destroyOnClose: true,
}));
const __VLS_98 = __VLS_97({
    modelValue: (__VLS_ctx.dialogVisible),
    title: (__VLS_ctx.editId ? '编辑数据模型' : '新建数据模型'),
    width: "500px",
    destroyOnClose: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_97));
__VLS_99.slots.default;
const __VLS_100 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_101 = __VLS_asFunctionalComponent(__VLS_100, new __VLS_100({
    ref: "formRef",
    model: (__VLS_ctx.form),
    rules: (__VLS_ctx.rules),
    labelWidth: "90px",
}));
const __VLS_102 = __VLS_101({
    ref: "formRef",
    model: (__VLS_ctx.form),
    rules: (__VLS_ctx.rules),
    labelWidth: "90px",
}, ...__VLS_functionalComponentArgsRest(__VLS_101));
/** @type {typeof __VLS_ctx.formRef} */ ;
var __VLS_104 = {};
__VLS_103.slots.default;
const __VLS_106 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_107 = __VLS_asFunctionalComponent(__VLS_106, new __VLS_106({
    label: "模型名称",
    prop: "name",
}));
const __VLS_108 = __VLS_107({
    label: "模型名称",
    prop: "name",
}, ...__VLS_functionalComponentArgsRest(__VLS_107));
__VLS_109.slots.default;
const __VLS_110 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_111 = __VLS_asFunctionalComponent(__VLS_110, new __VLS_110({
    modelValue: (__VLS_ctx.form.name),
    placeholder: "请输入模型名称",
}));
const __VLS_112 = __VLS_111({
    modelValue: (__VLS_ctx.form.name),
    placeholder: "请输入模型名称",
}, ...__VLS_functionalComponentArgsRest(__VLS_111));
var __VLS_109;
const __VLS_114 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_115 = __VLS_asFunctionalComponent(__VLS_114, new __VLS_114({
    label: "描述",
}));
const __VLS_116 = __VLS_115({
    label: "描述",
}, ...__VLS_functionalComponentArgsRest(__VLS_115));
__VLS_117.slots.default;
const __VLS_118 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_119 = __VLS_asFunctionalComponent(__VLS_118, new __VLS_118({
    modelValue: (__VLS_ctx.form.description),
    type: "textarea",
    rows: (3),
    maxlength: "200",
    showWordLimit: true,
}));
const __VLS_120 = __VLS_119({
    modelValue: (__VLS_ctx.form.description),
    type: "textarea",
    rows: (3),
    maxlength: "200",
    showWordLimit: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_119));
var __VLS_117;
var __VLS_103;
{
    const { footer: __VLS_thisSlot } = __VLS_99.slots;
    const __VLS_122 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_123 = __VLS_asFunctionalComponent(__VLS_122, new __VLS_122({
        ...{ 'onClick': {} },
    }));
    const __VLS_124 = __VLS_123({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_123));
    let __VLS_126;
    let __VLS_127;
    let __VLS_128;
    const __VLS_129 = {
        onClick: (...[$event]) => {
            __VLS_ctx.dialogVisible = false;
        }
    };
    __VLS_125.slots.default;
    var __VLS_125;
    const __VLS_130 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_131 = __VLS_asFunctionalComponent(__VLS_130, new __VLS_130({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.saving),
    }));
    const __VLS_132 = __VLS_131({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.saving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_131));
    let __VLS_134;
    let __VLS_135;
    let __VLS_136;
    const __VLS_137 = {
        onClick: (__VLS_ctx.handleSubmit)
    };
    __VLS_133.slots.default;
    var __VLS_133;
}
var __VLS_99;
/** @type {__VLS_StyleScopedClasses['model-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['model-sidebar']} */ ;
/** @type {__VLS_StyleScopedClasses['model-sidebar-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['model-list-item']} */ ;
/** @type {__VLS_StyleScopedClasses['model-item-name']} */ ;
/** @type {__VLS_StyleScopedClasses['model-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['model-main']} */ ;
/** @type {__VLS_StyleScopedClasses['model-empty-main']} */ ;
/** @type {__VLS_StyleScopedClasses['model-detail-header']} */ ;
/** @type {__VLS_StyleScopedClasses['model-detail-title']} */ ;
/** @type {__VLS_StyleScopedClasses['model-detail-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['model-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['model-config-section']} */ ;
/** @type {__VLS_StyleScopedClasses['model-config-section']} */ ;
// @ts-ignore
var __VLS_105 = __VLS_104;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            ElButton: ElButton,
            ElInput: ElInput,
            DataAnalysis: DataAnalysis,
            Edit: Edit,
            Plus: Plus,
            ModelJoinConfig: ModelJoinConfig,
            ModelCalcFields: ModelCalcFields,
            loading: loading,
            sideSearch: sideSearch,
            selectedId: selectedId,
            selected: selected,
            filteredRows: filteredRows,
            saveConfig: saveConfig,
            dialogVisible: dialogVisible,
            saving: saving,
            editId: editId,
            formRef: formRef,
            form: form,
            rules: rules,
            openCreate: openCreate,
            openEdit: openEdit,
            handleSubmit: handleSubmit,
            handleDelete: handleDelete,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
