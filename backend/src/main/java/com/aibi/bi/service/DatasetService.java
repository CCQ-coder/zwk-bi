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
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class DatasetService {

    private static final Logger log = LoggerFactory.getLogger(DatasetService.class);

    private final BiDatasetMapper biDatasetMapper;
    private final BiDatasetFieldMapper biDatasetFieldMapper;
    private final BiDatasourceMapper biDatasourceMapper;
    private final BiDatasetFolderMapper biDatasetFolderMapper;
    private final DatasourceService datasourceService;

    public DatasetService(BiDatasetMapper biDatasetMapper,
                          BiDatasetFieldMapper biDatasetFieldMapper,
                          BiDatasourceMapper biDatasourceMapper,
                          BiDatasetFolderMapper biDatasetFolderMapper,
                          DatasourceService datasourceService) {
        this.biDatasetMapper = biDatasetMapper;
        this.biDatasetFieldMapper = biDatasetFieldMapper;
        this.biDatasourceMapper = biDatasourceMapper;
        this.biDatasetFolderMapper = biDatasetFolderMapper;
        this.datasourceService = datasourceService;
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
        // Include datasets with null folderId AND orphaned datasets whose folderId
        // points to a non-existent folder
        Set<Long> existingFolderIds = folderMap.keySet();
        List<BiDataset> uncategorized = allDatasets.stream()
                .filter(d -> d.getFolderId() == null ||
                        !existingFolderIds.contains(d.getFolderId()))
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
        ensureDatasetDatasource(datasource);
        return datasourceService.previewDatasource(request.getDatasourceId(), request.getSqlText(), null);
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
        ensureDatasetDatasource(datasource);
        return datasourceService.previewDatasource(dataset.getDatasourceId(), dataset.getSqlText(), null);
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
        ensureDatasetDatasource(datasource);
        datasourceService.previewDatasource(datasourceId, sqlText, null);
    }

    private void syncDatasetFields(BiDataset dataset) {
        BiDatasource datasource = biDatasourceMapper.findById(dataset.getDatasourceId());
        if (datasource == null) {
            throw new IllegalArgumentException("Datasource not found: " + dataset.getDatasourceId());
        }
        ensureDatasetDatasource(datasource);
        DatasetPreviewResponse preview = datasourceService.previewDatasource(dataset.getDatasourceId(), dataset.getSqlText(), null);
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
        String normalizedSql = sqlText == null ? "" : sqlText.toLowerCase(Locale.ROOT);
        if (normalizedSql.contains("demo_sales_monthly")) {
            return buildDemoResponse(
                    Arrays.asList("月份", "销售额"),
                    new Object[][]{
                            {"1月", 12000}, {"2月", 13500}, {"3月", 15200},
                            {"4月", 14800}, {"5月", 16700}, {"6月", 18900},
                            {"7月", 21000}, {"8月", 19500}, {"9月", 17300},
                            {"10月", 20100}, {"11月", 25600}, {"12月", 30400}
                    }
            );
                    } else if (normalizedSql.contains("demo_sales_region")) {
            return buildDemoResponse(
                    Arrays.asList("区域", "销售额"),
                    new Object[][]{
                            {"华北", 45600}, {"华东", 78900}, {"华南", 62300},
                            {"华中", 38700}, {"西南", 29400}, {"西北", 18500}
                    }
            );
                    } else if (normalizedSql.contains("demo_category_pie")) {
            return buildDemoResponse(
                    Arrays.asList("产品类别", "销售占比"),
                    new Object[][]{
                            {"电子产品", 35.5}, {"服装", 22.3}, {"食品", 18.7},
                            {"家居", 12.4}, {"运动", 7.6}, {"其他", 3.5}
                    }
            );
                    } else if (normalizedSql.contains("demo_user_growth")) {
            return buildDemoResponse(
                    Arrays.asList("月份", "用户数"),
                    new Object[][]{
                            {"1月", 5200}, {"2月", 5800}, {"3月", 6700},
                            {"4月", 7200}, {"5月", 8100}, {"6月", 9300},
                            {"7月", 10500}, {"8月", 11200}, {"9月", 12800},
                            {"10月", 14600}, {"11月", 16200}, {"12月", 18900}
                    }
            );
        } else if (normalizedSql.contains("demo_tea_order") && normalizedSql.contains("left join") && normalizedSql.contains("demo_tea_material")) {
            return buildTeaStoreProfitDemoResponse();
        } else if (normalizedSql.contains("demo_tea_material")) {
            return buildTeaMaterialCostDemoResponse();
        } else if (normalizedSql.contains("demo_tea_order") && normalizedSql.contains("count(distinct `账单流水号`)")) {
            return buildTeaDailySummaryDemoResponse();
        } else if (normalizedSql.contains("demo_tea_order") && normalizedSql.contains("group by `品线`")) {
            return buildTeaLineRankingDemoResponse();
        } else if (normalizedSql.contains("demo_tea_order")) {
            return buildTeaOrderDetailDemoResponse();
        } else if (normalizedSql.contains("demo_animal_screen_1")) {
            return buildAnimalScreenDemoResponse();
        }
        // Generic multi-field demo
        return buildDemoResponse(
                Arrays.asList("名称", "数值"),
                new Object[][]{
                        {"A", 100}, {"B", 200}, {"C", 150}, {"D", 300}, {"E", 250}
                }
        );
    }

    private void ensureDatasetDatasource(BiDatasource datasource) {
        if (!datasourceService.isDatabaseDatasource(datasource)) {
            throw new IllegalArgumentException("SQL 数据集仅支持数据库类型数据源");
        }
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

        private DatasetPreviewResponse buildTeaOrderDetailDemoResponse() {
        return buildDemoResponse(
            Arrays.asList("店铺", "品线", "菜品名称", "冷/热", "规格", "销售数量", "单价", "销售金额", "销售日期"),
            new Object[][]{
                {"乐园店", "浓郁椰奶", "生榨纯椰", "冷", "纸大", 168, new BigDecimal("16.00"), new BigDecimal("2688.00"), LocalDate.of(2024, 3, 24)},
                {"香橙店", "爆料果汁", "爆粒鲜橙", "冷", "纸", 194, new BigDecimal("6.00"), new BigDecimal("1164.00"), LocalDate.of(2024, 3, 21)},
                {"果元店", "超大果茶", "爆粒鲜橙", "热", "塑大", 247, new BigDecimal("6.00"), new BigDecimal("1482.00"), LocalDate.of(2024, 3, 19)},
                {"蓝墨店", "滋味果昔", "珍珠奶茶", "冷", "纸大", 246, new BigDecimal("6.00"), new BigDecimal("1476.00"), LocalDate.of(2024, 3, 23)},
                {"南都店", "爆料果汁", "爆粒鲜橙", "冷", "40塑", 144, new BigDecimal("6.00"), new BigDecimal("864.00"), LocalDate.of(2024, 3, 11)}
            }
        );
        }

        private DatasetPreviewResponse buildTeaDailySummaryDemoResponse() {
        return buildDemoResponse(
            Arrays.asList("日期", "店铺", "品线", "销售数量", "销售金额", "订单数"),
            new Object[][]{
                {LocalDate.of(2024, 3, 29), "乐园店", "滋味果昔", 144, new BigDecimal("864.00"), 1},
                {LocalDate.of(2024, 3, 24), "乐园店", "醇香奶茶", 174, new BigDecimal("1044.00"), 1},
                {LocalDate.of(2024, 3, 23), "蓝墨店", "滋味果昔", 246, new BigDecimal("1476.00"), 1},
                {LocalDate.of(2024, 3, 21), "香橙店", "爆料果汁", 194, new BigDecimal("1164.00"), 1},
                {LocalDate.of(2024, 3, 11), "南都店", "爆料果汁", 144, new BigDecimal("864.00"), 1}
            }
        );
        }

        private DatasetPreviewResponse buildTeaLineRankingDemoResponse() {
        return buildDemoResponse(
            Arrays.asList("品线", "销售数量", "销售金额"),
            new Object[][]{
                {"滋味果昔", 601, new BigDecimal("3606.00")},
                {"爆料果汁", 473, new BigDecimal("2838.00")},
                {"浓郁椰奶", 411, new BigDecimal("2466.00")},
                {"超大果茶", 247, new BigDecimal("1482.00")},
                {"醇香奶茶", 174, new BigDecimal("1044.00")}
            }
        );
        }

        private DatasetPreviewResponse buildTeaMaterialCostDemoResponse() {
        return buildDemoResponse(
            Arrays.asList("日期", "店铺", "用途", "金额"),
            new Object[][]{
                {LocalDate.of(2024, 3, 28), "蓝墨店", "原料购进", new BigDecimal("243.00")},
                {LocalDate.of(2024, 3, 25), "果元店", "原料购进", new BigDecimal("211.00")},
                {LocalDate.of(2024, 3, 21), "乐园店", "原料购进", new BigDecimal("183.00")},
                {LocalDate.of(2024, 3, 13), "水围店", "原料购进", new BigDecimal("576.00")},
                {LocalDate.of(2024, 3, 10), "香橙店", "原料购进", new BigDecimal("190.00")}
            }
        );
        }

        private DatasetPreviewResponse buildTeaStoreProfitDemoResponse() {
        return buildDemoResponse(
            Arrays.asList("日期", "店铺", "销售金额", "原料费用", "毛利"),
            new Object[][]{
                {LocalDate.of(2024, 3, 28), "蓝墨店", new BigDecimal("930.00"), new BigDecimal("243.00"), new BigDecimal("687.00")},
                {LocalDate.of(2024, 3, 24), "乐园店", new BigDecimal("2688.00"), new BigDecimal("183.00"), new BigDecimal("2505.00")},
                {LocalDate.of(2024, 3, 21), "香橙店", new BigDecimal("1164.00"), new BigDecimal("190.00"), new BigDecimal("974.00")},
                {LocalDate.of(2024, 3, 11), "南都店", new BigDecimal("864.00"), new BigDecimal("101.00"), new BigDecimal("763.00")}
            }
        );
        }

    private DatasetPreviewResponse buildAnimalScreenDemoResponse() {
        return buildDemoResponse(
                Arrays.asList("模块", "动物", "品类", "指标", "数值", "单位", "简介", "生态位", "能力", "得分", "时段", "活跃指数", "综合值", "排序"),
                new Object[][]{
                        {"档案卡", "雪山狼犬", "犬科", null, null, null, "高寒巡护型犬种，耐力和嗅觉表现突出，适合山地搜救、夜间巡视与长距离追踪。", null, null, null, null, null, null, 1},
                        {"档案卡", "月影灵猫", "猫科", null, null, null, "夜行潜伏型猫科样本，跃迁能力和夜视能力极强，擅长狭窄环境侦察与静默接近。", null, null, null, null, null, null, 2},
                        {"指标", "雪山狼犬", "犬科", "体重kg", new BigDecimal("38.6"), "kg", null, null, null, null, null, null, null, 10},
                        {"指标", "雪山狼犬", "犬科", "奔跑速度", 61, "km/h", null, null, null, null, null, null, null, 11},
                        {"指标", "雪山狼犬", "犬科", "嗅觉评分", 96, "pts", null, null, null, null, null, null, null, 12},
                        {"指标", "月影灵猫", "猫科", "体重kg", new BigDecimal("7.4"), "kg", null, null, null, null, null, null, null, 13},
                        {"指标", "月影灵猫", "猫科", "跳跃高度", 232, "cm", null, null, null, null, null, null, null, 14},
                        {"指标", "月影灵猫", "猫科", "夜视指数", 98, "pts", null, null, null, null, null, null, null, 15},
                        {"生态位占比", null, null, null, 32, "%", null, "山地巡护", null, null, null, null, null, 20},
                        {"生态位占比", null, null, null, 24, "%", null, "城市搜救", null, null, null, null, null, 21},
                        {"生态位占比", null, null, null, 18, "%", null, "夜间潜行", null, null, null, null, null, 22},
                        {"生态位占比", null, null, null, 26, "%", null, "湿地追踪", null, null, null, null, null, 23},
                        {"感知排行", null, null, null, null, null, null, null, "夜视", 98, null, null, null, 30},
                        {"感知排行", null, null, null, null, null, null, null, "嗅觉", 96, null, null, null, 31},
                        {"感知排行", null, null, null, null, null, null, null, "听觉", 92, null, null, null, 32},
                        {"感知排行", null, null, null, null, null, null, null, "耐力", 89, null, null, null, 33},
                        {"感知排行", null, null, null, null, null, null, null, "社交", 84, null, null, null, 34},
                        {"综合评分", "雪山狼犬", "犬科", null, null, null, null, null, null, null, null, null, 95, 40},
                        {"综合评分", "月影灵猫", "猫科", null, null, null, null, null, null, null, null, null, 93, 41},
                        {"综合评分", "银背猎隼", "鸟纲", null, null, null, null, null, null, null, null, null, 88, 42},
                        {"综合评分", "潮汐海豚", "鲸偶蹄目", null, null, null, null, null, null, null, null, null, 86, 43},
                        {"综合评分", "岩岭雪豹", "猫科", null, null, null, null, null, null, null, null, null, 90, 44},
                        {"活动趋势", "雪山狼犬", "犬科", null, null, null, null, null, null, null, "06:00", 62, null, 50},
                        {"活动趋势", "雪山狼犬", "犬科", null, null, null, null, null, null, null, "09:00", 78, null, 51},
                        {"活动趋势", "雪山狼犬", "犬科", null, null, null, null, null, null, null, "12:00", 65, null, 52},
                        {"活动趋势", "雪山狼犬", "犬科", null, null, null, null, null, null, null, "15:00", 84, null, 53},
                        {"活动趋势", "雪山狼犬", "犬科", null, null, null, null, null, null, null, "18:00", 92, null, 54},
                        {"活动趋势", "雪山狼犬", "犬科", null, null, null, null, null, null, null, "21:00", 74, null, 55},
                        {"活动趋势", "月影灵猫", "猫科", null, null, null, null, null, null, null, "06:00", 24, null, 56},
                        {"活动趋势", "月影灵猫", "猫科", null, null, null, null, null, null, null, "09:00", 38, null, 57},
                        {"活动趋势", "月影灵猫", "猫科", null, null, null, null, null, null, null, "12:00", 48, null, 58},
                        {"活动趋势", "月影灵猫", "猫科", null, null, null, null, null, null, null, "15:00", 66, null, 59},
                        {"活动趋势", "月影灵猫", "猫科", null, null, null, null, null, null, null, "18:00", 88, null, 60},
                        {"活动趋势", "月影灵猫", "猫科", null, null, null, null, null, null, null, "21:00", 96, null, 61}
                }
        );
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

