package com.aibi.bi.controller;

import com.aibi.bi.common.ApiResponse;
import com.aibi.bi.auth.RequireRoles;
import com.aibi.bi.domain.BiDataset;
import com.aibi.bi.domain.BiDatasetField;
import com.aibi.bi.domain.BiDatasetFolder;
import com.aibi.bi.model.request.CreateDatasetRequest;
import com.aibi.bi.model.request.DatasetPreviewRequest;
import com.aibi.bi.model.request.UpdateDatasetRequest;
import com.aibi.bi.model.response.DatasetPreviewResponse;
import com.aibi.bi.service.DatasetService;
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
import java.util.Map;

@RestController
@RequestMapping("/api/datasets")
public class DatasetController {

    private final DatasetService datasetService;

    public DatasetController(DatasetService datasetService) {
        this.datasetService = datasetService;
    }

    @GetMapping
    public ApiResponse<List<BiDataset>> list() {
        return ApiResponse.ok(datasetService.list());
    }

    @GetMapping("/folder-tree")
    public ApiResponse<List<BiDatasetFolder>> folderTree() {
        return ApiResponse.ok(datasetService.listFolderTree());
    }

    @GetMapping("/{id}")
    public ApiResponse<BiDataset> getById(@PathVariable Long id) {
        BiDataset dataset = datasetService.getById(id);
        if (dataset == null) {
            return ApiResponse.fail(40401, "Dataset not found");
        }
        return ApiResponse.ok(dataset);
    }

    @GetMapping("/{id}/fields")
    public ApiResponse<List<BiDatasetField>> listFields(@PathVariable Long id) {
        return ApiResponse.ok(datasetService.listFields(id));
    }

    @GetMapping("/{id}/preview-data")
    public ApiResponse<DatasetPreviewResponse> previewDataset(@PathVariable Long id) {
        return ApiResponse.ok(datasetService.previewDataset(id));
    }

    @PostMapping
    @RequireRoles({"ADMIN", "ANALYST"})
    public ApiResponse<BiDataset> create(@Valid @RequestBody CreateDatasetRequest request) {
        return ApiResponse.ok(datasetService.create(request));
    }

    @PostMapping("/preview")
    @RequireRoles({"ADMIN", "ANALYST"})
    public ApiResponse<DatasetPreviewResponse> preview(@Valid @RequestBody DatasetPreviewRequest request) {
        return ApiResponse.ok(datasetService.preview(request));
    }

    @PutMapping("/{id}")
    @RequireRoles({"ADMIN", "ANALYST"})
    public ApiResponse<BiDataset> update(@PathVariable Long id,
                                          @Valid @RequestBody UpdateDatasetRequest request) {
        return ApiResponse.ok(datasetService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @RequireRoles({"ADMIN", "ANALYST"})
    public ApiResponse<Void> delete(@PathVariable Long id) {
        datasetService.delete(id);
        return ApiResponse.ok(null);
    }

    // ---- Folder endpoints ----

    @PostMapping("/folders")
    @RequireRoles({"ADMIN", "ANALYST"})
    public ApiResponse<BiDatasetFolder> createFolder(@RequestBody Map<String, Object> body) {
        String name = (String) body.get("name");
        Long parentId = body.get("parentId") != null ? Long.valueOf(body.get("parentId").toString()) : null;
        return ApiResponse.ok(datasetService.createFolder(name, parentId));
    }

    @PutMapping("/folders/{id}")
    @RequireRoles({"ADMIN", "ANALYST"})
    public ApiResponse<BiDatasetFolder> renameFolder(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        String name = (String) body.get("name");
        return ApiResponse.ok(datasetService.renameFolder(id, name));
    }

    @DeleteMapping("/folders/{id}")
    @RequireRoles({"ADMIN", "ANALYST"})
    public ApiResponse<Void> deleteFolder(@PathVariable Long id) {
        datasetService.deleteFolder(id);
        return ApiResponse.ok(null);
    }
}

