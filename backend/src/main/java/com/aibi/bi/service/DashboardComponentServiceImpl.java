package com.aibi.bi.service;

import com.aibi.bi.domain.BiDashboardComponent;
import com.aibi.bi.mapper.BiDashboardComponentMapper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
public class DashboardComponentServiceImpl implements DashboardComponentService {

    private final BiDashboardComponentMapper mapper;

    public DashboardComponentServiceImpl(BiDashboardComponentMapper mapper) {
        this.mapper = mapper;
    }

    @Override
    public List<BiDashboardComponent> listByDashboard(Long dashboardId) {
        return mapper.listByDashboardId(dashboardId);
    }

    @Override
    public BiDashboardComponent add(BiDashboardComponent component) {
        if (component.getDashboardId() == null) {
            throw new IllegalArgumentException("缺少大屏标识");
        }
        if (component.getChartId() == null) {
            throw new IllegalArgumentException("请选择要引用的组件");
        }
        if (component.getPosX() == null) {
            component.setPosX(0);
        }
        if (component.getPosY() == null) {
            component.setPosY(0);
        }
        if (component.getWidth() == null || component.getWidth() <= 0) {
            component.setWidth(12);
        }
        if (component.getHeight() == null || component.getHeight() <= 0) {
            component.setHeight(4);
        }
        if (component.getZIndex() == null) {
            component.setZIndex(0);
        }
        if (!StringUtils.hasText(component.getConfigJson())) {
            component.setConfigJson("{}");
        }
        mapper.insert(component);
        return component;
    }

    @Override
    public BiDashboardComponent update(Long dashboardId, Long id, BiDashboardComponent req) {
        BiDashboardComponent existing = mapper.findById(id);
        if (existing == null) {
            throw new IllegalArgumentException("组件不存在: " + id);
        }
        if (!existing.getDashboardId().equals(dashboardId)) {
            throw new IllegalArgumentException("组件不属于当前大屏: " + id);
        }
        if (req.getDashboardId() != null && !req.getDashboardId().equals(existing.getDashboardId())) {
            throw new IllegalArgumentException("不允许变更组件所属大屏");
        }
        if (req.getChartId() != null) {
            existing.setChartId(req.getChartId());
        }
        if (req.getPosX() != null) {
            existing.setPosX(req.getPosX());
        }
        if (req.getPosY() != null) {
            existing.setPosY(req.getPosY());
        }
        if (req.getWidth() != null && req.getWidth() > 0) {
            existing.setWidth(req.getWidth());
        }
        if (req.getHeight() != null && req.getHeight() > 0) {
            existing.setHeight(req.getHeight());
        }
        if (req.getZIndex() != null) {
            existing.setZIndex(req.getZIndex());
        }
        if (req.getConfigJson() != null) {
            existing.setConfigJson(req.getConfigJson());
        }
        mapper.update(existing);
        return existing;
    }

    @Override
    public void delete(Long dashboardId, Long id) {
        BiDashboardComponent existing = mapper.findById(id);
        if (existing == null) {
            return;
        }
        if (!existing.getDashboardId().equals(dashboardId)) {
            throw new IllegalArgumentException("组件不属于当前大屏: " + id);
        }
        mapper.deleteById(id);
    }

    @Override
    public void deleteByDashboard(Long dashboardId) {
        mapper.deleteByDashboardId(dashboardId);
    }
}