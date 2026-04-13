package com.aibi.bi.controller;

import com.aibi.bi.common.ApiResponse;
import com.aibi.bi.domain.BiChartTemplate;
import com.aibi.bi.service.ChartTemplateService;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 图表模板接口
 * GET    /api/chart-templates         — 查询模板列表
 * GET    /api/chart-templates/{id}    — 查询单个模板
 * POST   /api/chart-templates         — 新建模板
 * PUT    /api/chart-templates/{id}    — 更新模板
 * DELETE /api/chart-templates/{id}    — 删除模板
 */
@RestController
@RequestMapping("/api/chart-templates")
public class ChartTemplateController {

    private final ChartTemplateService service;

    public ChartTemplateController(ChartTemplateService service) {
        this.service = service;
    }

    @GetMapping
    public ApiResponse<List<BiChartTemplate>> list() {
        return ApiResponse.ok(service.list());
    }

    @GetMapping("/{id}")
    public ApiResponse<BiChartTemplate> getById(@PathVariable Long id) {
        BiChartTemplate t = service.getById(id);
        if (t == null) return ApiResponse.fail(40401, "模板不存在");
        return ApiResponse.ok(t);
    }

    @PostMapping
    public ApiResponse<BiChartTemplate> create(@RequestBody BiChartTemplate req) {
        return ApiResponse.ok(service.create(req));
    }

    @PutMapping("/{id}")
    public ApiResponse<BiChartTemplate> update(@PathVariable Long id,
                                                @RequestBody BiChartTemplate req) {
        return ApiResponse.ok(service.update(id, req));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ApiResponse.ok(null);
    }
}
