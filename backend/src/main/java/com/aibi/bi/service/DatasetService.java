package com.aibi.bi.service;

import com.aibi.bi.domain.BiDataset;
import com.aibi.bi.domain.BiDatasource;
import com.aibi.bi.mapper.BiDatasourceMapper;
import com.aibi.bi.mapper.BiDatasetMapper;
import com.aibi.bi.model.request.CreateDatasetRequest;
import com.aibi.bi.model.request.DatasetPreviewRequest;
import com.aibi.bi.model.request.UpdateDatasetRequest;
import com.aibi.bi.model.response.DatasetPreviewResponse;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class DatasetService {

    private final BiDatasetMapper biDatasetMapper;
    private final BiDatasourceMapper biDatasourceMapper;
    private final JdbcPreviewService jdbcPreviewService;

    public DatasetService(BiDatasetMapper biDatasetMapper,
                          BiDatasourceMapper biDatasourceMapper,
                          JdbcPreviewService jdbcPreviewService) {
        this.biDatasetMapper = biDatasetMapper;
        this.biDatasourceMapper = biDatasourceMapper;
        this.jdbcPreviewService = jdbcPreviewService;
    }

    public List<BiDataset> list() {
        return biDatasetMapper.listAll();
    }

    public BiDataset getById(Long id) {
        return biDatasetMapper.findById(id);
    }

    public BiDataset create(CreateDatasetRequest request) {
        BiDataset entity = new BiDataset();
        entity.setName(request.getName());
        entity.setDatasourceId(request.getDatasourceId());
        entity.setSqlText(request.getSqlText());
        biDatasetMapper.insert(entity);
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
        biDatasetMapper.update(entity);
        return entity;
    }

    public void delete(Long id) {
        biDatasetMapper.deleteById(id);
    }

    public DatasetPreviewResponse preview(DatasetPreviewRequest request) {
        BiDatasource datasource = biDatasourceMapper.findById(request.getDatasourceId());
        if (datasource == null) {
            throw new IllegalArgumentException("Datasource not found: " + request.getDatasourceId());
        }
        return jdbcPreviewService.preview(datasource, request.getSqlText());
    }
}

