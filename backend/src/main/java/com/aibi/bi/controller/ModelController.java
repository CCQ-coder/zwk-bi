package com.aibi.bi.controller;

import com.aibi.bi.common.ApiResponse;
import com.aibi.bi.auth.RequireRoles;
import com.aibi.bi.domain.BiModel;
import com.aibi.bi.model.request.CreateModelRequest;
import com.aibi.bi.model.request.UpdateModelRequest;
import com.aibi.bi.service.ModelService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/models")
public class ModelController {

    private final ModelService modelService;

    public ModelController(ModelService modelService) {
        this.modelService = modelService;
    }

    @GetMapping
    public ApiResponse<List<BiModel>> list() {
        return ApiResponse.ok(modelService.list());
    }

    @GetMapping("/{id}")
    public ApiResponse<BiModel> getById(@PathVariable Long id) {
        BiModel m = modelService.getById(id);
        if (m == null) return ApiResponse.fail(40401, "Model not found");
        return ApiResponse.ok(m);
    }

    @PostMapping
    @RequireRoles({"ADMIN", "ANALYST"})
    public ApiResponse<BiModel> create(@Valid @RequestBody CreateModelRequest req) {
        return ApiResponse.ok(modelService.create(req));
    }

    @PutMapping("/{id}")
    @RequireRoles({"ADMIN", "ANALYST"})
    public ApiResponse<BiModel> update(@PathVariable Long id,
                                        @Valid @RequestBody UpdateModelRequest req) {
        return ApiResponse.ok(modelService.update(id, req));
    }

    @DeleteMapping("/{id}")
    @RequireRoles({"ADMIN", "ANALYST"})
    public ApiResponse<Void> delete(@PathVariable Long id) {
        modelService.delete(id);
        return ApiResponse.ok(null);
    }
}
