package com.aibi.bi.service;

import com.aibi.bi.domain.BiDataset;
import com.aibi.bi.domain.BiDatasetField;
import com.aibi.bi.domain.BiDatasource;
import com.aibi.bi.mapper.BiDatasourceMapper;
import com.aibi.bi.mapper.BiDatasetFieldMapper;
import com.aibi.bi.mapper.BiDatasetMapper;
import com.aibi.bi.model.request.CreateDatasetRequest;
import com.aibi.bi.model.request.DatasetPreviewRequest;
import com.aibi.bi.model.request.UpdateDatasetRequest;
import com.aibi.bi.model.response.DatasetPreviewResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
public class DatasetService {

    private static final Logger log = LoggerFactory.getLogger(DatasetService.class);

    private final BiDatasetMapper biDatasetMapper;
    private final BiDatasetFieldMapper biDatasetFieldMapper;
    private final BiDatasourceMapper biDatasourceMapper;
    private final JdbcPreviewService jdbcPreviewService;

    public DatasetService(BiDatasetMapper biDatasetMapper,
                          BiDatasetFieldMapper biDatasetFieldMapper,
                          BiDatasourceMapper biDatasourceMapper,
                          JdbcPreviewService jdbcPreviewService) {
        this.biDatasetMapper = biDatasetMapper;
        this.biDatasetFieldMapper = biDatasetFieldMapper;
        this.biDatasourceMapper = biDatasourceMapper;
        this.jdbcPreviewService = jdbcPreviewService;
    }

    public List<BiDataset> list() {
        return biDatasetMapper.listAll();
    }

    public BiDataset getById(Long id) {
        return biDatasetMapper.findById(id);
    }

    public List<BiDatasetField> listFields(Long datasetId) {
        return biDatasetFieldMapper.listByDatasetId(datasetId);
    }

    public BiDataset create(CreateDatasetRequest request) {
        BiDataset entity = new BiDataset();
        entity.setName(request.getName());
        entity.setDatasourceId(request.getDatasourceId());
        entity.setSqlText(request.getSqlText());
        previewAndValidate(entity.getDatasourceId(), entity.getSqlText());
        biDatasetMapper.insert(entity);
        syncDatasetFields(entity);
        return entity;
    }

    public BiDataset update(Long id, UpdateDatasetRequest request) {
        BiDataset entity = biDatasetMapper.findById(id);
        if (entity == null) {
            throw new IllegalArgumentException("Dataset not found: " + id);
        }
        entity.setName(request.getName());
        entity.setDatasourceId(request.getDatasourceId());
        entity.setSqlText(request.getSqlText());
        previewAndValidate(entity.getDatasourceId(), entity.getSqlText());
        biDatasetMapper.update(entity);
        syncDatasetFields(entity);
        return entity;
    }

    public void delete(Long id) {
        biDatasetFieldMapper.deleteByDatasetId(id);
        biDatasetMapper.deleteById(id);
    }

    public DatasetPreviewResponse preview(DatasetPreviewRequest request) {
        BiDatasource datasource = biDatasourceMapper.findById(request.getDatasourceId());
        if (datasource == null) {
            throw new IllegalArgumentException("Datasource not found: " + request.getDatasourceId());
        }
        return jdbcPreviewService.preview(datasource, request.getSqlText());
    }

    public void refreshAllDatasetFields() {
        for (BiDataset dataset : biDatasetMapper.listAll()) {
            try {
                syncDatasetFields(dataset);
            } catch (Exception ex) {
                log.warn("Skip dataset field sync for dataset {} because preview failed: {}", dataset.getId(), ex.getMessage());
            }
        }
    }

    private void previewAndValidate(Long datasourceId, String sqlText) {
        BiDatasource datasource = biDatasourceMapper.findById(datasourceId);
        if (datasource == null) {
            throw new IllegalArgumentException("Datasource not found: " + datasourceId);
        }
        jdbcPreviewService.preview(datasource, sqlText);
    }

    private void syncDatasetFields(BiDataset dataset) {
        BiDatasource datasource = biDatasourceMapper.findById(dataset.getDatasourceId());
        if (datasource == null) {
            throw new IllegalArgumentException("Datasource not found: " + dataset.getDatasourceId());
        }
        DatasetPreviewResponse preview = jdbcPreviewService.preview(datasource, dataset.getSqlText());
        biDatasetFieldMapper.deleteByDatasetId(dataset.getId());
        if (preview.getColumns() == null || preview.getColumns().isEmpty()) {
            return;
        }
        List<BiDatasetField> fields = preview.getColumns().stream().map(column -> {
            BiDatasetField field = new BiDatasetField();
            field.setDatasetId(dataset.getId());
            field.setFieldName(column);
            field.setFieldLabel(column);
            field.setFieldType(inferFieldType(column, preview.getRows()));
            return field;
        }).toList();
        if (!fields.isEmpty()) {
            biDatasetFieldMapper.batchInsert(fields);
        }
    }

    private String inferFieldType(String column, List<Map<String, Object>> rows) {
        if (rows == null) {
            return "string";
        }
        for (Map<String, Object> row : rows) {
            Object value = row.get(column);
            if (value == null) {
                continue;
            }
            if (value instanceof Integer || value instanceof Long || value instanceof Short) {
                return "integer";
            }
            if (value instanceof Float || value instanceof Double || value instanceof BigDecimal) {
                return "number";
            }
            if (value instanceof Boolean) {
                return "boolean";
            }
            if (value instanceof LocalDate || value instanceof LocalDateTime || value instanceof java.util.Date) {
                return "datetime";
            }
            return "string";
        }
        return "string";
    }
}

