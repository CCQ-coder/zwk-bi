import request from './request';
export const getPublicDashboardById = (dashboardId, token) => request.get(`/public/reports/${dashboardId}`, { params: { token } });
export const getPublicDashboardComponents = (dashboardId, token) => request.get(`/public/reports/${dashboardId}/components`, { params: { token } });
export const getPublicChartList = (dashboardId, token) => request.get(`/public/reports/${dashboardId}/charts`, { params: { token } });
export const getPublicComponentData = (dashboardId, componentId, token, filters) => request.get(`/public/reports/${dashboardId}/components/${componentId}/data`, {
    params: {
        token,
        ...(filters && Object.keys(filters).length ? { filterJson: JSON.stringify(filters) } : {}),
    }
});
