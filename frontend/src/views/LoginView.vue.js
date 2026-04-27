import { onMounted, onUnmounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Lock, User } from '@element-plus/icons-vue';
import sceneAlpineCube from '../assets/login/uploaded/scene-1.png';
import sceneMoonTerrace from '../assets/login/uploaded/scene-2.png';
import sceneSunsetVilla from '../assets/login/uploaded/scene-3.png';
import sceneAlpineLake from '../assets/login/uploaded/scene-4.png';
import { login } from '../api/auth';
import { getCurrentMenus } from '../api/menu';
import { saveAuthMenus, saveAuthSession } from '../utils/auth-session';
import { getPlatformBranding } from '../utils/platform-settings';
const router = useRouter();
const formRef = ref();
const loading = ref(false);
const rememberUser = ref(true);
const loginForm = reactive({ username: '', password: '' });
const branding = getPlatformBranding();
const platformName = ref(branding.name);
const platformSlogan = ref(branding.slogan);
const copyright = ref(branding.copyright);
const version = ref(branding.version);
const sceneSlides = [
    { label: '冰湖立方', image: sceneAlpineCube },
    { label: '月下露台', image: sceneMoonTerrace },
    { label: '日落水院', image: sceneSunsetVilla },
    { label: '雪山湖湾', image: sceneAlpineLake },
];
const currentBg = ref(0);
let bgTimer = null;
const goToBg = (i) => {
    currentBg.value = ((i % sceneSlides.length) + sceneSlides.length) % sceneSlides.length;
};
const nextBg = () => goToBg(currentBg.value + 1);
const prevBg = () => goToBg(currentBg.value - 1);
const rules = {
    username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
    password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
};
const quickAccounts = [
    { label: '管理员', username: 'admin', password: '123456' }
];
const fillQuick = (item) => {
    loginForm.username = item.username;
    loginForm.password = item.password;
};
const onForgotPwd = () => {
    ElMessageBox.alert('请联系系统管理员重置密码，或登录后在「系统设置 → 用户管理」中维护密码。', '忘记密码', {
        confirmButtonText: '我知道了'
    });
};
const onSSO = () => {
    ElMessageBox.alert('SSO 单点登录功能正在配置中，请使用账号密码登录。', 'SSO 登录', {
        confirmButtonText: '知道了'
    });
};
const handleLogin = async () => {
    if (!formRef.value)
        return;
    try {
        await formRef.value.validate();
    }
    catch {
        return;
    }
    loading.value = true;
    try {
        const result = await login({ username: loginForm.username, password: loginForm.password });
        saveAuthSession(result);
        const menus = await getCurrentMenus();
        saveAuthMenus(menus);
        if (rememberUser.value) {
            localStorage.setItem('bi_last_username', loginForm.username);
        }
        else {
            localStorage.removeItem('bi_last_username');
        }
        ElMessage.success(`欢迎回来，${result.displayName || result.username}`);
        router.push('/home');
    }
    finally {
        loading.value = false;
    }
};
onMounted(() => {
    const lastUsername = localStorage.getItem('bi_last_username');
    if (lastUsername) {
        loginForm.username = lastUsername;
        rememberUser.value = true;
    }
    else {
        rememberUser.value = false;
    }
    bgTimer = setInterval(nextBg, 6000);
});
onUnmounted(() => {
    if (bgTimer)
        clearInterval(bgTimer);
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['login-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['shell-nova']} */ ;
/** @type {__VLS_StyleScopedClasses['shell-nova']} */ ;
/** @type {__VLS_StyleScopedClasses['shell-nova']} */ ;
/** @type {__VLS_StyleScopedClasses['shell-nova']} */ ;
/** @type {__VLS_StyleScopedClasses['scene-slide']} */ ;
/** @type {__VLS_StyleScopedClasses['scene-glow']} */ ;
/** @type {__VLS_StyleScopedClasses['scene-vignette']} */ ;
/** @type {__VLS_StyleScopedClasses['scene-reflection']} */ ;
/** @type {__VLS_StyleScopedClasses['scene-star']} */ ;
/** @type {__VLS_StyleScopedClasses['scene-star']} */ ;
/** @type {__VLS_StyleScopedClasses['scene-star']} */ ;
/** @type {__VLS_StyleScopedClasses['scene-star']} */ ;
/** @type {__VLS_StyleScopedClasses['feat']} */ ;
/** @type {__VLS_StyleScopedClasses['feat']} */ ;
/** @type {__VLS_StyleScopedClasses['scene-nav__btn']} */ ;
/** @type {__VLS_StyleScopedClasses['scene-nav__btn']} */ ;
/** @type {__VLS_StyleScopedClasses['scene-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-form']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-form']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-form']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-form']} */ ;
/** @type {__VLS_StyleScopedClasses['el-input__wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-form']} */ ;
/** @type {__VLS_StyleScopedClasses['el-input__wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-form']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-form']} */ ;
/** @type {__VLS_StyleScopedClasses['el-input__inner']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-form']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-form']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-form']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-form']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-form']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-btn__icon']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-or']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-or__text']} */ ;
/** @type {__VLS_StyleScopedClasses['sso-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['sso-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-quick__tag']} */ ;
/** @type {__VLS_StyleScopedClasses['login-stage']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['login-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['login-stage']} */ ;
/** @type {__VLS_StyleScopedClasses['scene-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['scene-features']} */ ;
/** @type {__VLS_StyleScopedClasses['scene-kicker']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-title']} */ ;
/** @type {__VLS_StyleScopedClasses['scene-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-logo']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-title']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['scene-star']} */ ;
/** @type {__VLS_StyleScopedClasses['shell-nova']} */ ;
/** @type {__VLS_StyleScopedClasses['scene-slide']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['sso-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['scene-nav__btn']} */ ;
/** @type {__VLS_StyleScopedClasses['scene-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-quick__tag']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-form']} */ ;
/** @type {__VLS_StyleScopedClasses['el-input__wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['sso-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-btn__icon']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "login-shell" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "shell-novas" },
    'aria-hidden': "true",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "shell-nova shell-nova--1" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "shell-nova shell-nova--2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "shell-nova shell-nova--3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "login-stage" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "scene-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "scene-slides" },
    'aria-hidden': "true",
});
for (const [scene, i] of __VLS_getVForSourceType((__VLS_ctx.sceneSlides))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        key: (scene.label),
        ...{ class: "scene-slide" },
        ...{ class: ({ active: i === __VLS_ctx.currentBg }) },
        ...{ style: ({ backgroundImage: `url(${scene.image})` }) },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "scene-glow" },
    'aria-hidden': "true",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "scene-vignette" },
    'aria-hidden': "true",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "scene-reflection" },
    'aria-hidden': "true",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "scene-stars" },
    'aria-hidden': "true",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "scene-star scene-star--1" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "scene-star scene-star--2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "scene-star scene-star--3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "scene-star scene-star--4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "scene-body" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
    ...{ class: "scene-hd" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "scene-logo" },
    'aria-label': "AI BI Workspace",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
    width: "36",
    height: "36",
    viewBox: "0 0 36 36",
    fill: "none",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.rect)({
    width: "36",
    height: "36",
    rx: "10",
    fill: "rgba(255,255,255,0.18)",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
    d: "M18 6l10 5.8v11.6L18 29 8 23.4V11.6L18 6z",
    fill: "none",
    stroke: "rgba(255,255,255,0.85)",
    'stroke-width': "1.6",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
    d: "M18 12l5 2.9v5.8L18 23l-5-2.3V14.9L18 12z",
    fill: "rgba(255,255,255,0.3)",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.circle)({
    cx: "18",
    cy: "18",
    r: "3",
    fill: "rgba(255,255,255,0.92)",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "scene-hero" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "scene-kicker" },
});
(__VLS_ctx.sceneSlides[__VLS_ctx.currentBg]?.label);
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({
    ...{ class: "scene-title" },
});
(__VLS_ctx.platformName);
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "scene-sub" },
});
(__VLS_ctx.platformSlogan);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "scene-spacer" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "scene-features" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "scene-features__eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "scene-features__list" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "feat" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "feat__dot" },
    'aria-hidden': "true",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "feat__title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "feat__desc" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "feat" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "feat__dot feat__dot--violet" },
    'aria-hidden': "true",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "feat__title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "feat__desc" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "feat" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "feat__dot feat__dot--sky" },
    'aria-hidden': "true",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "feat__title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "feat__desc" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.footer, __VLS_intrinsicElements.footer)({
    ...{ class: "scene-ft" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "scene-copy-text" },
});
(__VLS_ctx.copyright);
__VLS_asFunctionalElement(__VLS_intrinsicElements.nav, __VLS_intrinsicElements.nav)({
    ...{ class: "scene-nav" },
    'aria-label': "切换背景",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.prevBg) },
    type: "button",
    ...{ class: "scene-nav__btn" },
    'aria-label': "上一张",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
    width: "8",
    height: "12",
    viewBox: "0 0 8 12",
    fill: "none",
    'aria-hidden': "true",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
    d: "M6 1 2 6l4 5",
    stroke: "currentColor",
    'stroke-width': "1.8",
    'stroke-linecap': "round",
    'stroke-linejoin': "round",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "scene-dots" },
    role: "group",
    'aria-label': "背景选择",
});
for (const [scene, i] of __VLS_getVForSourceType((__VLS_ctx.sceneSlides))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.goToBg(i);
            } },
        key: (scene.label),
        type: "button",
        ...{ class: "scene-dot" },
        ...{ class: ({ 'scene-dot--on': i === __VLS_ctx.currentBg }) },
        'aria-label': (scene.label),
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.nextBg) },
    type: "button",
    ...{ class: "scene-nav__btn" },
    'aria-label': "下一张",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
    width: "8",
    height: "12",
    viewBox: "0 0 8 12",
    fill: "none",
    'aria-hidden': "true",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
    d: "M2 1l4 5-4 5",
    stroke: "currentColor",
    'stroke-width': "1.8",
    'stroke-linecap': "round",
    'stroke-linejoin': "round",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "auth-panel" },
    'aria-label': "登录",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "auth-logo" },
    'aria-hidden': "true",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
    width: "44",
    height: "44",
    viewBox: "0 0 44 44",
    fill: "none",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.rect)({
    width: "44",
    height: "44",
    rx: "14",
    fill: "#EEF4FF",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
    d: "M22 8l11 6.35v12.7L22 34 11 27.05V14.35L22 8z",
    fill: "none",
    stroke: "#2563EB",
    'stroke-width': "1.8",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
    d: "M22 14l6 3.46v6.92L22 27.5l-6-3.12V17.46L22 14z",
    fill: "rgba(59,130,246,0.18)",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.circle)({
    cx: "22",
    cy: "22",
    r: "3.5",
    fill: "#2563EB",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "auth-head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
    ...{ class: "auth-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "auth-sub" },
});
const __VLS_0 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ 'onSubmit': {} },
    ref: "formRef",
    ...{ class: "auth-form" },
    model: (__VLS_ctx.loginForm),
    rules: (__VLS_ctx.rules),
}));
const __VLS_2 = __VLS_1({
    ...{ 'onSubmit': {} },
    ref: "formRef",
    ...{ class: "auth-form" },
    model: (__VLS_ctx.loginForm),
    rules: (__VLS_ctx.rules),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_4;
let __VLS_5;
let __VLS_6;
const __VLS_7 = {
    onSubmit: (__VLS_ctx.handleLogin)
};
/** @type {typeof __VLS_ctx.formRef} */ ;
var __VLS_8 = {};
__VLS_3.slots.default;
const __VLS_10 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_11 = __VLS_asFunctionalComponent(__VLS_10, new __VLS_10({
    prop: "username",
}));
const __VLS_12 = __VLS_11({
    prop: "username",
}, ...__VLS_functionalComponentArgsRest(__VLS_11));
__VLS_13.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    for: "f-user",
    ...{ class: "sr-only" },
});
const __VLS_14 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_15 = __VLS_asFunctionalComponent(__VLS_14, new __VLS_14({
    ...{ 'onKeyup': {} },
    id: "f-user",
    modelValue: (__VLS_ctx.loginForm.username),
    size: "large",
    placeholder: "请输入账号",
    prefixIcon: (__VLS_ctx.User),
}));
const __VLS_16 = __VLS_15({
    ...{ 'onKeyup': {} },
    id: "f-user",
    modelValue: (__VLS_ctx.loginForm.username),
    size: "large",
    placeholder: "请输入账号",
    prefixIcon: (__VLS_ctx.User),
}, ...__VLS_functionalComponentArgsRest(__VLS_15));
let __VLS_18;
let __VLS_19;
let __VLS_20;
const __VLS_21 = {
    onKeyup: (__VLS_ctx.handleLogin)
};
var __VLS_17;
var __VLS_13;
const __VLS_22 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_23 = __VLS_asFunctionalComponent(__VLS_22, new __VLS_22({
    prop: "password",
}));
const __VLS_24 = __VLS_23({
    prop: "password",
}, ...__VLS_functionalComponentArgsRest(__VLS_23));
__VLS_25.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    for: "f-pass",
    ...{ class: "sr-only" },
});
const __VLS_26 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_27 = __VLS_asFunctionalComponent(__VLS_26, new __VLS_26({
    ...{ 'onKeyup': {} },
    id: "f-pass",
    modelValue: (__VLS_ctx.loginForm.password),
    type: "password",
    size: "large",
    placeholder: "请输入密码",
    showPassword: true,
    prefixIcon: (__VLS_ctx.Lock),
}));
const __VLS_28 = __VLS_27({
    ...{ 'onKeyup': {} },
    id: "f-pass",
    modelValue: (__VLS_ctx.loginForm.password),
    type: "password",
    size: "large",
    placeholder: "请输入密码",
    showPassword: true,
    prefixIcon: (__VLS_ctx.Lock),
}, ...__VLS_functionalComponentArgsRest(__VLS_27));
let __VLS_30;
let __VLS_31;
let __VLS_32;
const __VLS_33 = {
    onKeyup: (__VLS_ctx.handleLogin)
};
var __VLS_29;
var __VLS_25;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "auth-row" },
});
const __VLS_34 = {}.ElCheckbox;
/** @type {[typeof __VLS_components.ElCheckbox, typeof __VLS_components.elCheckbox, typeof __VLS_components.ElCheckbox, typeof __VLS_components.elCheckbox, ]} */ ;
// @ts-ignore
const __VLS_35 = __VLS_asFunctionalComponent(__VLS_34, new __VLS_34({
    modelValue: (__VLS_ctx.rememberUser),
}));
const __VLS_36 = __VLS_35({
    modelValue: (__VLS_ctx.rememberUser),
}, ...__VLS_functionalComponentArgsRest(__VLS_35));
__VLS_37.slots.default;
var __VLS_37;
const __VLS_38 = {}.ElLink;
/** @type {[typeof __VLS_components.ElLink, typeof __VLS_components.elLink, typeof __VLS_components.ElLink, typeof __VLS_components.elLink, ]} */ ;
// @ts-ignore
const __VLS_39 = __VLS_asFunctionalComponent(__VLS_38, new __VLS_38({
    ...{ 'onClick': {} },
    type: "primary",
    underline: "never",
}));
const __VLS_40 = __VLS_39({
    ...{ 'onClick': {} },
    type: "primary",
    underline: "never",
}, ...__VLS_functionalComponentArgsRest(__VLS_39));
let __VLS_42;
let __VLS_43;
let __VLS_44;
const __VLS_45 = {
    onClick: (__VLS_ctx.onForgotPwd)
};
__VLS_41.slots.default;
var __VLS_41;
const __VLS_46 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_47 = __VLS_asFunctionalComponent(__VLS_46, new __VLS_46({
    ...{ 'onClick': {} },
    type: "primary",
    size: "large",
    ...{ class: "auth-btn" },
    loading: (__VLS_ctx.loading),
}));
const __VLS_48 = __VLS_47({
    ...{ 'onClick': {} },
    type: "primary",
    size: "large",
    ...{ class: "auth-btn" },
    loading: (__VLS_ctx.loading),
}, ...__VLS_functionalComponentArgsRest(__VLS_47));
let __VLS_50;
let __VLS_51;
let __VLS_52;
const __VLS_53 = {
    onClick: (__VLS_ctx.handleLogin)
};
__VLS_49.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "auth-btn__label" },
});
(__VLS_ctx.loading ? '登录中...' : '登录');
if (!__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "auth-btn__icon" },
        'aria-hidden': "true",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
        width: "18",
        height: "18",
        viewBox: "0 0 18 18",
        fill: "none",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
        d: "M3 9h12M15 9l-4-5M15 9l-4 5",
        stroke: "currentColor",
        'stroke-width': "2",
        'stroke-linecap': "round",
        'stroke-linejoin': "round",
    });
}
var __VLS_49;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "auth-or" },
    'aria-hidden': "true",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "auth-or__text" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.onSSO) },
    type: "button",
    ...{ class: "sso-btn" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
    width: "15",
    height: "15",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    'stroke-width': "2.2",
    'stroke-linecap': "round",
    'stroke-linejoin': "round",
    'aria-hidden': "true",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.rect)({
    x: "3",
    y: "11",
    width: "18",
    height: "11",
    rx: "2",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
    d: "M7 11V7a5 5 0 0 1 10 0v4",
});
if (__VLS_ctx.quickAccounts.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "auth-quick" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "auth-quick__label" },
    });
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.quickAccounts))) {
        const __VLS_54 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_55 = __VLS_asFunctionalComponent(__VLS_54, new __VLS_54({
            ...{ 'onClick': {} },
            key: (item.username),
            ...{ class: "auth-quick__tag" },
            effect: "plain",
        }));
        const __VLS_56 = __VLS_55({
            ...{ 'onClick': {} },
            key: (item.username),
            ...{ class: "auth-quick__tag" },
            effect: "plain",
        }, ...__VLS_functionalComponentArgsRest(__VLS_55));
        let __VLS_58;
        let __VLS_59;
        let __VLS_60;
        const __VLS_61 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.quickAccounts.length))
                    return;
                __VLS_ctx.fillQuick(item);
            }
        };
        __VLS_57.slots.default;
        (item.label);
        var __VLS_57;
    }
}
var __VLS_3;
/** @type {__VLS_StyleScopedClasses['login-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['shell-novas']} */ ;
/** @type {__VLS_StyleScopedClasses['shell-nova']} */ ;
/** @type {__VLS_StyleScopedClasses['shell-nova--1']} */ ;
/** @type {__VLS_StyleScopedClasses['shell-nova']} */ ;
/** @type {__VLS_StyleScopedClasses['shell-nova--2']} */ ;
/** @type {__VLS_StyleScopedClasses['shell-nova']} */ ;
/** @type {__VLS_StyleScopedClasses['shell-nova--3']} */ ;
/** @type {__VLS_StyleScopedClasses['login-stage']} */ ;
/** @type {__VLS_StyleScopedClasses['scene-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['scene-slides']} */ ;
/** @type {__VLS_StyleScopedClasses['scene-slide']} */ ;
/** @type {__VLS_StyleScopedClasses['scene-glow']} */ ;
/** @type {__VLS_StyleScopedClasses['scene-vignette']} */ ;
/** @type {__VLS_StyleScopedClasses['scene-reflection']} */ ;
/** @type {__VLS_StyleScopedClasses['scene-stars']} */ ;
/** @type {__VLS_StyleScopedClasses['scene-star']} */ ;
/** @type {__VLS_StyleScopedClasses['scene-star--1']} */ ;
/** @type {__VLS_StyleScopedClasses['scene-star']} */ ;
/** @type {__VLS_StyleScopedClasses['scene-star--2']} */ ;
/** @type {__VLS_StyleScopedClasses['scene-star']} */ ;
/** @type {__VLS_StyleScopedClasses['scene-star--3']} */ ;
/** @type {__VLS_StyleScopedClasses['scene-star']} */ ;
/** @type {__VLS_StyleScopedClasses['scene-star--4']} */ ;
/** @type {__VLS_StyleScopedClasses['scene-body']} */ ;
/** @type {__VLS_StyleScopedClasses['scene-hd']} */ ;
/** @type {__VLS_StyleScopedClasses['scene-logo']} */ ;
/** @type {__VLS_StyleScopedClasses['scene-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['scene-kicker']} */ ;
/** @type {__VLS_StyleScopedClasses['scene-title']} */ ;
/** @type {__VLS_StyleScopedClasses['scene-sub']} */ ;
/** @type {__VLS_StyleScopedClasses['scene-spacer']} */ ;
/** @type {__VLS_StyleScopedClasses['scene-features']} */ ;
/** @type {__VLS_StyleScopedClasses['scene-features__eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['scene-features__list']} */ ;
/** @type {__VLS_StyleScopedClasses['feat']} */ ;
/** @type {__VLS_StyleScopedClasses['feat__dot']} */ ;
/** @type {__VLS_StyleScopedClasses['feat__title']} */ ;
/** @type {__VLS_StyleScopedClasses['feat__desc']} */ ;
/** @type {__VLS_StyleScopedClasses['feat']} */ ;
/** @type {__VLS_StyleScopedClasses['feat__dot']} */ ;
/** @type {__VLS_StyleScopedClasses['feat__dot--violet']} */ ;
/** @type {__VLS_StyleScopedClasses['feat__title']} */ ;
/** @type {__VLS_StyleScopedClasses['feat__desc']} */ ;
/** @type {__VLS_StyleScopedClasses['feat']} */ ;
/** @type {__VLS_StyleScopedClasses['feat__dot']} */ ;
/** @type {__VLS_StyleScopedClasses['feat__dot--sky']} */ ;
/** @type {__VLS_StyleScopedClasses['feat__title']} */ ;
/** @type {__VLS_StyleScopedClasses['feat__desc']} */ ;
/** @type {__VLS_StyleScopedClasses['scene-ft']} */ ;
/** @type {__VLS_StyleScopedClasses['scene-copy-text']} */ ;
/** @type {__VLS_StyleScopedClasses['scene-nav']} */ ;
/** @type {__VLS_StyleScopedClasses['scene-nav__btn']} */ ;
/** @type {__VLS_StyleScopedClasses['scene-dots']} */ ;
/** @type {__VLS_StyleScopedClasses['scene-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['scene-nav__btn']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-logo']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-head']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-title']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-sub']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-form']} */ ;
/** @type {__VLS_StyleScopedClasses['sr-only']} */ ;
/** @type {__VLS_StyleScopedClasses['sr-only']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-row']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-btn__label']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-btn__icon']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-or']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-or__text']} */ ;
/** @type {__VLS_StyleScopedClasses['sso-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-quick']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-quick__label']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-quick__tag']} */ ;
// @ts-ignore
var __VLS_9 = __VLS_8;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Lock: Lock,
            User: User,
            formRef: formRef,
            loading: loading,
            rememberUser: rememberUser,
            loginForm: loginForm,
            platformName: platformName,
            platformSlogan: platformSlogan,
            copyright: copyright,
            sceneSlides: sceneSlides,
            currentBg: currentBg,
            goToBg: goToBg,
            nextBg: nextBg,
            prevBg: prevBg,
            rules: rules,
            quickAccounts: quickAccounts,
            fillQuick: fillQuick,
            onForgotPwd: onForgotPwd,
            onSSO: onSSO,
            handleLogin: handleLogin,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
