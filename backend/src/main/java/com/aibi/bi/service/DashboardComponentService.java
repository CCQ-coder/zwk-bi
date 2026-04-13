package com.aibi.bi.service;

import com.aibi.bi.domain.BiDashboardComponent;
import com.aibi.bi.mapper.BiDashboardComponentMapper;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class DashboardComponentService {

    private final BiDashboardComponentMapper mapper;

    public DashboardComponentService(BiDashboardComponentMapper mapper) {
        this.mapper = mapper;
    }

    public List<BiDashboardComponent> listByDashboard(Long dashboardId) {
        return mapper.listByDashboardId(dashboardId);
    }

    public BiDashboardComponent add(BiDashboardComponent component) {
        if (component.getWidth() <= 0) component.setWidth(12);
        if (component.getHeight() <= 0) component.setHeight(4);
        mapper.insert(component);
        return component;
    }

    public BiDashboardComponent update(Long id, BiDashboardComponent req) {
        BiDashboardComponent existing = mapper.findById(id);
        if (existing == null) {
            throw new IllegalArgumentException("组件不存在: " + id);
        }
        existing.setPosX(req.getPosX());
        existing.setPosY(req.getPosY());
        existing.setWidth(req.getWidth() > 0 ? req.getWidth() : existing.getWidth());
        existing.setHeight(req.getHeight() > 0 ? req.getHeight() : existing.getHeight());
        existing.setZIndex(req.getZIndex());
        mapper.update(existing);
        return existing;
    }

    public void delete(Long id) {
        mapper.deleteById(id);
    }

    public void deleteByDashboard(Long dashboardId) {
        mapper.deleteByDashboardId(dashboardId);
    }
}
