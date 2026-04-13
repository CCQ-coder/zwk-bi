package com.aibi.bi.controller;

import com.aibi.bi.common.ApiResponse;
import com.aibi.bi.domain.BiChart;
import com.aibi.bi.model.request.CreateChartRequest;
import com.aibi.bi.model.request.UpdateChartRequest;
import com.aibi.bi.service.ChartService;
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
@RequestMapping("/api/charts")
public class ChartController {

    private final ChartService chartService;

    public ChartController(ChartService chartService) {
        this.chartService = chartService;
    }

    @GetMapping
    public ApiResponse<List<BiChart>> list() {
        return ApiResponse.ok(chartService.list());
    }

    @GetMapping("/{id}")
    public ApiResponse<BiChart> getById(@PathVariable Long id) {
        BiChart chart = chartService.getById(id);
        if (chart == null) {
            return ApiResponse.fail(40401, "Chart not found");
        }
        return ApiResponse.ok(chart);
    }

    @PostMapping
    public ApiResponse<BiChart> create(@Valid @RequestBody CreateChartRequest request) {
        return ApiResponse.ok(chartService.create(request));
    }

    @PutMapping("/{id}")
    public ApiResponse<BiChart> update(@PathVariable Long id,
                                        @Valid @RequestBody UpdateChartRequest request) {
        return ApiResponse.ok(chartService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        chartService.delete(id);
        return ApiResponse.ok(null);
    }

    @GetMapping("/{id}/data")
    public ApiResponse<java.util.Map<String, Object>> getChartData(@PathVariable Long id) {
        return ApiResponse.ok(chartService.getChartData(id));
    }
}

