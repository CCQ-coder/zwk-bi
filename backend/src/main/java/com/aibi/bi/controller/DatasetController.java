package com.aibi.bi.controller;

import com.aibi.bi.common.ApiResponse;
import com.aibi.bi.domain.BiDataset;
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

    @GetMapping("/{id}")
    public ApiResponse<BiDataset> getById(@PathVariable Long id) {
        BiDataset dataset = datasetService.getById(id);
        if (dataset == null) {
            return ApiResponse.fail(40401, "Dataset not found");
        }
        return ApiResponse.ok(dataset);
    }

    @PostMapping
    public ApiResponse<BiDataset> create(@Valid @RequestBody CreateDatasetRequest request) {
        return ApiResponse.ok(datasetService.create(request));
    }

    @PostMapping("/preview")
    public ApiResponse<DatasetPreviewResponse> preview(@Valid @RequestBody DatasetPreviewRequest request) {
        return ApiResponse.ok(datasetService.preview(request));
    }

    @PutMapping("/{id}")
    public ApiResponse<BiDataset> update(@PathVariable Long id,
                                          @Valid @RequestBody UpdateDatasetRequest request) {
        return ApiResponse.ok(datasetService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        datasetService.delete(id);
        return ApiResponse.ok(null);
    }
}

