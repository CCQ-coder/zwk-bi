package com.aibi.bi.service;

import com.aibi.bi.domain.BiDatasource;
import com.aibi.bi.mapper.BiDatasourceMapper;
import com.aibi.bi.mapper.BiDatasetMapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DatasourceServiceTest {

    @Mock
    private BiDatasourceMapper biDatasourceMapper;
    @Mock
    private BiDatasetMapper biDatasetMapper;
    @Mock
    private JdbcPreviewService jdbcPreviewService;

    private DatasourceService datasourceService;

    @BeforeEach
    void setUp() {
        datasourceService = new DatasourceService(
                biDatasourceMapper,
                biDatasetMapper,
                jdbcPreviewService,
                new ObjectMapper()
        );
    }

    @Test
    void delete_blocksDatasourceWhenStillReferenced() {
        BiDatasource datasource = new BiDatasource();
        datasource.setId(6L);
        datasource.setName("de_dcak56");
        when(biDatasourceMapper.findById(6L)).thenReturn(datasource);
        when(biDatasetMapper.countByDatasourceId(6L)).thenReturn(2L);

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> datasourceService.delete(6L));

        assertEquals("当前数据源仍被 2 个数据集引用，请先修改或删除这些数据集后再删除数据源", exception.getMessage());
        verify(biDatasourceMapper, never()).deleteById(6L);
    }

    @Test
    void delete_removesDatasourceWhenNoReferencesRemain() {
        BiDatasource datasource = new BiDatasource();
        datasource.setId(5L);
        datasource.setName("ERP MySQL");
        when(biDatasourceMapper.findById(5L)).thenReturn(datasource);
        when(biDatasetMapper.countByDatasourceId(5L)).thenReturn(0L);

        datasourceService.delete(5L);

        verify(biDatasourceMapper).deleteById(5L);
    }
}