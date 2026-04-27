package com.aibi.bi.service;

import com.aibi.bi.domain.BiChartTemplate;

import java.util.List;

public interface ChartTemplateService {

    List<BiChartTemplate> list();

    BiChartTemplate getById(Long id);

    BiChartTemplate create(BiChartTemplate req);

    BiChartTemplate update(Long id, BiChartTemplate req);

    void delete(Long id);

    void ensureBuiltinAssets();
}
