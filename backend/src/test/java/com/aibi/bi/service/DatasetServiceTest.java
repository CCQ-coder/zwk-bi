package com.aibi.bi.service;

import com.aibi.bi.mapper.BiDatasourceMapper;
import com.aibi.bi.mapper.BiDatasetFieldMapper;
import com.aibi.bi.mapper.BiDatasetFolderMapper;
import com.aibi.bi.mapper.BiDatasetMapper;
import com.aibi.bi.model.response.DatasetPreviewResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.junit.jupiter.api.extension.ExtendWith;

import java.util.List;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@ExtendWith(MockitoExtension.class)
class DatasetServiceTest {

    @Mock
    private BiDatasetMapper biDatasetMapper;
    @Mock
    private BiDatasetFieldMapper biDatasetFieldMapper;
    @Mock
    private BiDatasourceMapper biDatasourceMapper;
    @Mock
    private BiDatasetFolderMapper biDatasetFolderMapper;
    @Mock
    private DatasourceService datasourceService;

    private DatasetService datasetService;

    @BeforeEach
    void setUp() {
        datasetService = new DatasetService(
                biDatasetMapper,
                biDatasetFieldMapper,
                biDatasourceMapper,
                biDatasetFolderMapper,
                datasourceService
        );
    }

    @ParameterizedTest
    @MethodSource("teaPreviewCases")
    void getDemoPreviewResponse_returnsExpectedTeaPreview(String sql,
                                                          List<String> expectedColumns,
                                                          int expectedRowCount,
                                                          String expectedFirstKey) {
        DatasetPreviewResponse response = datasetService.getDemoPreviewResponse(sql);

        assertEquals(expectedColumns, response.getColumns());
        assertEquals(expectedRowCount, response.getRowCount());
        assertEquals(expectedRowCount, response.getRows().size());
        assertTrue(response.getRows().get(0).containsKey(expectedFirstKey));
    }

    private static Stream<Arguments> teaPreviewCases() {
        return Stream.of(
                Arguments.of(
                        "SELECT * FROM demo_tea_order ORDER BY 销售日期 DESC",
                        List.of("店铺", "品线", "菜品名称", "冷/热", "规格", "销售数量", "单价", "销售金额", "销售日期"),
                        5,
                        "店铺"
                ),
                Arguments.of(
                        "SELECT COUNT(DISTINCT `账单流水号`) FROM demo_tea_order GROUP BY DATE(`销售日期`), `店铺`, `品线`",
                        List.of("日期", "店铺", "品线", "销售数量", "销售金额", "订单数"),
                        5,
                        "订单数"
                ),
                Arguments.of(
                        "SELECT `品线`, SUM(`销售数量` * `单价`) AS `销售金额` FROM demo_tea_order GROUP BY `品线`",
                        List.of("品线", "销售数量", "销售金额"),
                        5,
                        "品线"
                ),
                Arguments.of(
                        "SELECT DATE(`日期`) AS `日期`, `店铺`, `用途`, `金额` FROM demo_tea_material ORDER BY `日期` DESC",
                        List.of("日期", "店铺", "用途", "金额"),
                        5,
                        "金额"
                ),
                Arguments.of(
                        "SELECT o.`日期`, o.`店铺`, o.`销售金额`, COALESCE(m.`原料费用`, 0) AS `原料费用`, (o.`销售金额` - COALESCE(m.`原料费用`, 0)) AS `毛利` FROM demo_tea_order o LEFT JOIN demo_tea_material m ON o.`店铺` = m.`店铺`",
                        List.of("日期", "店铺", "销售金额", "原料费用", "毛利"),
                        4,
                        "毛利"
                )
        );
    }
}