package com.aibi.bi.service;

import com.aibi.bi.domain.BiChartTemplate;
import com.aibi.bi.mapper.BiChartTemplateMapper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
public class ChartTemplateService {

    private final BiChartTemplateMapper mapper;

    public ChartTemplateService(BiChartTemplateMapper mapper) {
        this.mapper = mapper;
    }

    public List<BiChartTemplate> list() {
        return mapper.listAll();
    }

    public BiChartTemplate getById(Long id) {
        return mapper.findById(id);
    }

    public BiChartTemplate create(BiChartTemplate req) {
        if (!StringUtils.hasText(req.getName())) throw new IllegalArgumentException("模板名称不能为空");
        if (!StringUtils.hasText(req.getChartType())) throw new IllegalArgumentException("图表类型不能为空");
        if (!StringUtils.hasText(req.getConfigJson())) req.setConfigJson("{}");
        mapper.insert(req);
        return req;
    }

    public BiChartTemplate update(Long id, BiChartTemplate req) {
        BiChartTemplate existing = mapper.findById(id);
        if (existing == null) throw new IllegalArgumentException("模板不存在: " + id);
        if (StringUtils.hasText(req.getName())) existing.setName(req.getName());
        if (StringUtils.hasText(req.getChartType())) existing.setChartType(req.getChartType());
        if (req.getConfigJson() != null) existing.setConfigJson(req.getConfigJson());
        mapper.update(existing);
        return existing;
    }

    public void delete(Long id) {
        mapper.deleteById(id);
    }
}
