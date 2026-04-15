package com.aibi.bi.service;

import com.aibi.bi.domain.BiDataset;
import com.aibi.bi.domain.BiDatasetField;
import com.aibi.bi.domain.BiDatasetFolder;
import com.aibi.bi.domain.BiDatasource;
import com.aibi.bi.mapper.BiDatasourceMapper;
import com.aibi.bi.mapper.BiDatasetFieldMapper;
import com.aibi.bi.mapper.BiDatasetFolderMapper;
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
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class DatasetService {

    private static final Logger log = LoggerFactory.getLogger(DatasetService.class);

    private final BiDatasetMapper biDatasetMapper;
    private final BiDatasetFieldMapper biDatasetFieldMapper;
    private final BiDatasourceMapper biDatasourceMapper;
    private final BiDatasetFolderMapper biDatasetFolderMapper;
    private final JdbcPreviewService jdbcPreviewService;

    public DatasetService(BiDatasetMapper biDatasetMapper,
                          BiDatasetFieldMapper biDatasetFieldMapper,
                          BiDatasourceMapper biDatasourceMapper,
                          BiDatasetFolderMapper biDatasetFolderMapper,
                          JdbcPreviewService jdbcPreviewService) {
        this.biDatasetMapper = biDatasetMapper;
        this.biDatasetFieldMapper = biDatasetFieldMapper;
        this.biDatasourceMapper = biDatasourceMapper;
        this.biDatasetFolderMapper = biDatasetFolderMapper;
        this.jdbcPreviewService = jdbcPreviewService;
    }

    public List<BiDataset> list() {
        return biDatasetMapper.listAll();
    }

    public List<BiDatasetFolder> listFolderTree() {
        List<BiDatasetFolder> allFolders = biDatasetFolderMapper.listAll();
        List<BiDataset> allDatasets = biDatasetMapper.listAll();

        // Group datasets by folderId; datasets with null folderId go into "uncategorized"
        Map<Long, List<BiDataset>> datasetsByFolder = allDatasets.stream()
                .filter(d -> d.getFolderId() != null)
                .collect(Collectors.groupingBy(BiDataset::getFolderId));

        // Assign datasets to folders
        Map<Long, BiDatasetFolder> folderMap = new LinkedHashMap<>();
        for (BiDatasetFolder folder : allFolders) {
            folder.setDatasets(datasetsByFolder.getOrDefault(folder.getId(), new ArrayList<>()));
            folder.setChildren(new ArrayList<>());
            folderMap.put(folder.getId(), folder);
        }

        // Build tree (parent-child relationships)
        List<BiDatasetFolder> roots = new ArrayList<>();
        for (BiDatasetFolder folder : allFolders) {
            if (folder.getParentId() == null) {
                roots.add(folder);
            } else {
                BiDatasetFolder parent = folderMap.get(folder.getParentId());
                if (parent != null) {
                    parent.getChildren().add(folder);
                } else {
                    roots.add(folder);
                }
            }
        }

        // Add virtual root for uncategorized datasets
        List<BiDataset> uncategorized = allDatasets.stream()
                .filter(d -> d.getFolderId() == null)
                .collect(Collectors.toList());
        if (!uncategorized.isEmpty()) {
            BiDatasetFolder uncatFolder = new BiDatasetFolder();
            uncatFolder.setId(-1L);
            uncatFolder.setName("未分类");
            uncatFolder.setSortOrder(9999);
            uncatFolder.setChildren(new ArrayList<>());
            uncatFolder.setDatasets(uncategorized);
            roots.add(uncatFolder);
        }

        return roots;
    }

    public BiDatasetFolder createFolder(String name, Long parentId) {
        BiDatasetFolder folder = new BiDatasetFolder();
        folder.setName(name);
        folder.setParentId(parentId);
        folder.setSortOrder(0);
        biDatasetFolderMapper.insert(folder);
        folder.setChildren(new ArrayList<>());
        folder.setDatasets(new ArrayList<>());
        return folder;
    }

    public BiDatasetFolder renameFolder(Long id, String name) {
        BiDatasetFolder folder = biDatasetFolderMapper.findById(id);
        if (folder == null) {
            throw new IllegalArgumentException("Folder not found: " + id);
        }
        folder.setName(name);
        biDatasetFolderMapper.update(folder);
        return folder;
    }

    public void deleteFolder(Long id) {
        biDatasetFolderMapper.deleteById(id);
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
        entity.setFolderId(request.getFolderId());
        if (!isDemoDataset(entity.getDatasourceId())) {
            previewAndValidate(entity.getDatasourceId(), entity.getSqlText());
        }
        biDatasetMapper.insert(entity);
        if (isDemoDataset(entity.getDatasourceId())) {
            syncDemoDatasetFields(entity);
        } else {
            syncDatasetFields(entity);
        }
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
        if (request.getFolderId() != null) {
            entity.setFolderId(request.getFolderId());
        }
        if (!isDemoDataset(entity.getDatasourceId())) {
            previewAndValidate(entity.getDatasourceId(), entity.getSqlText());
        }
        biDatasetMapper.update(entity);
        if (isDemoDataset(entity.getDatasourceId())) {
            syncDemoDatasetFields(entity);
        } else {
            syncDatasetFields(entity);
        }
        return entity;
    }

    public void delete(Long id) {
        biDatasetFieldMapper.deleteByDatasetId(id);
        biDatasetMapper.deleteById(id);
    }

    public DatasetPreviewResponse preview(DatasetPreviewRequest request) {
        if (isDemoDataset(request.getDatasourceId())) {
            return getDemoPreviewResponse(request.getSqlText());
        }
        BiDatasource datasource = biDatasourceMapper.findById(request.getDatasourceId());
        if (datasource == null) {
            throw new IllegalArgumentException("Datasource not found: " + request.getDatasourceId());
        }
        return jdbcPreviewService.preview(datasource, request.getSqlText());
    }

    public DatasetPreviewResponse previewDataset(Long datasetId) {
        BiDataset dataset = biDatasetMapper.findById(datasetId);
        if (dataset == null) {
            throw new IllegalArgumentException("Dataset not found: " + datasetId);
        }
        if (isDemoDataset(dataset.getDatasourceId())) {
            return getDemoPreviewResponse(dataset.getSqlText());
        }
        BiDatasource datasource = biDatasourceMapper.findById(dataset.getDatasourceId());
        if (datasource == null) {
            throw new IllegalArgumentException("Datasource not found: " + dataset.getDatasourceId());
        }
        return jdbcPreviewService.preview(datasource, dataset.getSqlText());
    }

    public void refreshAllDatasetFields() {
        for (BiDataset dataset : biDatasetMapper.listAll()) {
            try {
                if (isDemoDataset(dataset.getDatasourceId())) {
                    syncDemoDatasetFields(dataset);
                } else {
                    syncDatasetFields(dataset);
                }
            } catch (Exception ex) {
                log.warn("Skip dataset field sync for dataset {} because preview failed: {}", dataset.getId(), ex.getMessage());
            }
        }
    }

    private boolean isDemoDataset(Long datasourceId) {
        return datasourceId == null || datasourceId == 0L;
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

    private void syncDemoDatasetFields(BiDataset dataset) {
        DatasetPreviewResponse preview = getDemoPreviewResponse(dataset.getSqlText());
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

    public DatasetPreviewResponse getDemoPreviewResponse(String sqlText) {
        if (sqlText != null && sqlText.contains("demo_sales_monthly")) {
            return buildDemoResponse(
                    Arrays.asList("月份", "销售额"),
                    new Object[][]{
                            {"1月", 12000}, {"2月", 13500}, {"3月", 15200},
                            {"4月", 14800}, {"5月", 16700}, {"6月", 18900},
                            {"7月", 21000}, {"8月", 19500}, {"9月", 17300},
                            {"10月", 20100}, {"11月", 25600}, {"12月", 30400}
                    }
            );
        } else if (sqlText != null && sqlText.contains("demo_sales_region")) {
            return buildDemoResponse(
                    Arrays.asList("区域", "销售额"),
                    new Object[][]{
                            {"华北", 45600}, {"华东", 78900}, {"华南", 62300},
                            {"华中", 38700}, {"西南", 29400}, {"西北", 18500}
                    }
            );
        } else if (sqlText != null && sqlText.contains("demo_category_pie")) {
            return buildDemoResponse(
                    Arrays.asList("产品类别", "销售占比"),
                    new Object[][]{
                            {"电子产品", 35.5}, {"服装", 22.3}, {"食品", 18.7},
                            {"家居", 12.4}, {"运动", 7.6}, {"其他", 3.5}
                    }
            );
        } else if (sqlText != null && sqlText.contains("demo_user_growth")) {
            return buildDemoResponse(
                    Arrays.asList("月份", "用户数"),
                    new Object[][]{
                            {"1月", 5200}, {"2月", 5800}, {"3月", 6700},
                            {"4月", 7200}, {"5月", 8100}, {"6月", 9300},
                            {"7月", 10500}, {"8月", 11200}, {"9月", 12800},
                            {"10月", 14600}, {"11月", 16200}, {"12月", 18900}
                    }
            );
        }
        // Generic multi-field demo
        return buildDemoResponse(
                Arrays.asList("名称", "数值"),
                new Object[][]{
                        {"A", 100}, {"B", 200}, {"C", 150}, {"D", 300}, {"E", 250}
                }
        );
    }

    private DatasetPreviewResponse buildDemoResponse(List<String> columns, Object[][] data) {
        List<Map<String, Object>> rows = new ArrayList<>();
        for (Object[] rowData : data) {
            Map<String, Object> row = new LinkedHashMap<>();
            for (int i = 0; i < columns.size() && i < rowData.length; i++) {
                row.put(columns.get(i), rowData[i]);
            }
            rows.add(row);
        }
        DatasetPreviewResponse response = new DatasetPreviewResponse();
        response.setColumns(columns);
        response.setRows(rows);
        response.setRowCount(rows.size());
        return response;
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

