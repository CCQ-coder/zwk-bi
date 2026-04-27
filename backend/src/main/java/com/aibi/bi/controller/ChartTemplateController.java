package com.aibi.bi.controller;

import com.aibi.bi.common.ApiResponse;
import com.aibi.bi.auth.RequireRoles;
import com.aibi.bi.domain.BiChartTemplate;
import com.aibi.bi.model.request.CreateChartTemplateRequest;
import com.aibi.bi.model.request.UpdateChartTemplateRequest;
import com.aibi.bi.model.response.ChartTemplateResponse;
import com.aibi.bi.service.ChartTemplateService;
import jakarta.validation.Valid;
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
    public ApiResponse<List<ChartTemplateResponse>> list() {
        return ApiResponse.ok(service.list().stream().map(this::toResponse).toList());
    }

    @GetMapping("/{id}")
    public ApiResponse<ChartTemplateResponse> getById(@PathVariable Long id) {
        BiChartTemplate t = service.getById(id);
        if (t == null) return ApiResponse.fail(40401, "模板不存在");
        return ApiResponse.ok(toResponse(t));
    }

    @PostMapping
    @RequireRoles({"ADMIN", "ANALYST"})
    public ApiResponse<ChartTemplateResponse> create(@Valid @RequestBody CreateChartTemplateRequest request) {
        return ApiResponse.ok(toResponse(service.create(toDomain(request))));
    }

    @PutMapping("/{id}")
    @RequireRoles({"ADMIN", "ANALYST"})
    public ApiResponse<ChartTemplateResponse> update(@PathVariable Long id,
                                                     @RequestBody UpdateChartTemplateRequest request) {
        return ApiResponse.ok(toResponse(service.update(id, toDomain(request))));
    }

    @DeleteMapping("/{id}")
    @RequireRoles({"ADMIN", "ANALYST"})
    public ApiResponse<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ApiResponse.ok(null);
    }

    private BiChartTemplate toDomain(CreateChartTemplateRequest request) {
        BiChartTemplate template = new BiChartTemplate();
        template.setName(request.getName());
        template.setDescription(request.getDescription());
        template.setChartType(request.getChartType());
        template.setConfigJson(request.getConfigJson());
        return template;
    }

    private BiChartTemplate toDomain(UpdateChartTemplateRequest request) {
        BiChartTemplate template = new BiChartTemplate();
        template.setName(request.getName());
        template.setDescription(request.getDescription());
        template.setChartType(request.getChartType());
        template.setConfigJson(request.getConfigJson());
        return template;
    }

    private ChartTemplateResponse toResponse(BiChartTemplate template) {
        ChartTemplateResponse response = new ChartTemplateResponse();
        response.setId(template.getId());
        response.setName(template.getName());
        response.setDescription(template.getDescription());
        response.setChartType(template.getChartType());
        response.setConfigJson(template.getConfigJson());
        response.setBuiltIn(template.getBuiltIn());
        response.setSortOrder(template.getSortOrder());
        response.setCreatedBy(template.getCreatedBy());
        response.setCreatedAt(template.getCreatedAt());
        return response;
    }
}
