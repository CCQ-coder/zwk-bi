package com.aibi.bi.controller;

import com.aibi.bi.common.ApiResponse;
import com.aibi.bi.auth.RequireRoles;
import com.aibi.bi.domain.BiDatasource;
import com.aibi.bi.domain.BiDatasourceGroup;
import com.aibi.bi.model.request.CreateDatasourceRequest;
import com.aibi.bi.model.request.DatasourceConnectionTestRequest;
import com.aibi.bi.model.request.ExtractPreviewRequest;
import com.aibi.bi.model.request.UpdateDatasourceRequest;
import com.aibi.bi.model.response.DatasourceConnectionTestResponse;
import com.aibi.bi.model.response.ColumnInfo;
import com.aibi.bi.model.response.ExtractPreviewResponse;
import com.aibi.bi.model.response.TableInfo;
import com.aibi.bi.service.DatasourceService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/datasources")
public class DatasourceController {

    private final DatasourceService datasourceService;

    public DatasourceController(DatasourceService datasourceService) {
        this.datasourceService = datasourceService;
    }

    @GetMapping
    public ApiResponse<List<BiDatasource>> list() {
        return ApiResponse.ok(datasourceService.list());
    }

    @GetMapping("/groups")
    public ApiResponse<List<BiDatasourceGroup>> listGroups() {
        return ApiResponse.ok(datasourceService.listGroups());
    }

    @GetMapping("/{id}")
    public ApiResponse<BiDatasource> getById(@PathVariable Long id) {
        BiDatasource datasource = datasourceService.getById(id);
        if (datasource == null) {
            return ApiResponse.fail(40401, "Datasource not found");
        }
        return ApiResponse.ok(datasource);
    }

    @PostMapping
    @RequireRoles({"ADMIN", "ANALYST"})
    public ApiResponse<BiDatasource> create(@Valid @RequestBody CreateDatasourceRequest request) {
        return ApiResponse.ok(datasourceService.create(request));
    }

    @PostMapping("/groups")
    @RequireRoles({"ADMIN", "ANALYST"})
    public ApiResponse<BiDatasourceGroup> createGroup(@RequestBody Map<String, Object> body) {
        String name = body.get("name") == null ? null : body.get("name").toString();
        return ApiResponse.ok(datasourceService.createGroup(name));
    }

    @PostMapping("/test-connection")
    @RequireRoles({"ADMIN", "ANALYST"})
    public ApiResponse<DatasourceConnectionTestResponse> testConnection(
            @Valid @RequestBody DatasourceConnectionTestRequest request) {
        return ApiResponse.ok(datasourceService.testConnection(request));
    }

    @PostMapping("/extract/preview")
    @RequireRoles({"ADMIN", "ANALYST"})
    public ApiResponse<ExtractPreviewResponse> previewExtract(@Valid @RequestBody ExtractPreviewRequest request) {
        return ApiResponse.ok(datasourceService.previewExtract(request));
    }

    @PostMapping("/preview")
    @RequireRoles({"ADMIN", "ANALYST"})
    public ApiResponse<com.aibi.bi.model.response.DatasetPreviewResponse> previewDraft(
            @RequestBody DatasourceConnectionTestRequest request) {
        return ApiResponse.ok(datasourceService.previewDraft(request));
    }

    @PutMapping("/{id}")
    @RequireRoles({"ADMIN", "ANALYST"})
    public ApiResponse<BiDatasource> update(@PathVariable Long id,
                                             @Valid @RequestBody UpdateDatasourceRequest request) {
        return ApiResponse.ok(datasourceService.update(id, request));
    }

    @PutMapping("/groups/{id}")
    @RequireRoles({"ADMIN", "ANALYST"})
    public ApiResponse<BiDatasourceGroup> renameGroup(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        String name = body.get("name") == null ? null : body.get("name").toString();
        return ApiResponse.ok(datasourceService.renameGroup(id, name));
    }

    @GetMapping("/{id}/tables")
    public ApiResponse<List<TableInfo>> listTables(@PathVariable Long id) {
        return ApiResponse.ok(datasourceService.listTables(id));
    }

    @GetMapping("/{id}/columns")
    public ApiResponse<List<ColumnInfo>> listColumns(@PathVariable Long id,
                                                      @RequestParam String table) {
        return ApiResponse.ok(datasourceService.listColumns(id, table));
    }

    @GetMapping("/{id}/preview-data")
    public ApiResponse<com.aibi.bi.model.response.DatasetPreviewResponse> previewData(@PathVariable Long id) {
        return ApiResponse.ok(datasourceService.previewDatasourceData(id));
    }

    @DeleteMapping("/{id}")
    @RequireRoles({"ADMIN", "ANALYST"})
    public ApiResponse<Void> delete(@PathVariable Long id) {
        datasourceService.delete(id);
        return ApiResponse.ok(null);
    }

    @DeleteMapping("/groups/{id}")
    @RequireRoles({"ADMIN", "ANALYST"})
    public ApiResponse<Void> deleteGroup(@PathVariable Long id) {
        datasourceService.deleteGroup(id);
        return ApiResponse.ok(null);
    }
}

