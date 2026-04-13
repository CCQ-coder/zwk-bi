package com.aibi.bi.controller;

import com.aibi.bi.common.ApiResponse;
import com.aibi.bi.domain.BiDatasource;
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

    @GetMapping("/{id}")
    public ApiResponse<BiDatasource> getById(@PathVariable Long id) {
        BiDatasource datasource = datasourceService.getById(id);
        if (datasource == null) {
            return ApiResponse.fail(40401, "Datasource not found");
        }
        return ApiResponse.ok(datasource);
    }

    @PostMapping
    public ApiResponse<BiDatasource> create(@Valid @RequestBody CreateDatasourceRequest request) {
        return ApiResponse.ok(datasourceService.create(request));
    }

    @PostMapping("/test-connection")
    public ApiResponse<DatasourceConnectionTestResponse> testConnection(
            @Valid @RequestBody DatasourceConnectionTestRequest request) {
        return ApiResponse.ok(datasourceService.testConnection(request));
    }

    @PostMapping("/extract/preview")
    public ApiResponse<ExtractPreviewResponse> previewExtract(@Valid @RequestBody ExtractPreviewRequest request) {
        return ApiResponse.ok(datasourceService.previewExtract(request));
    }

    @PutMapping("/{id}")
    public ApiResponse<BiDatasource> update(@PathVariable Long id,
                                             @Valid @RequestBody UpdateDatasourceRequest request) {
        return ApiResponse.ok(datasourceService.update(id, request));
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

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        datasourceService.delete(id);
        return ApiResponse.ok(null);
    }
}

