package com.aibi.bi.service;

import com.aibi.bi.domain.BiModel;
import com.aibi.bi.mapper.BiModelMapper;
import com.aibi.bi.model.request.CreateModelRequest;
import com.aibi.bi.model.request.UpdateModelRequest;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ModelService {

    private final BiModelMapper biModelMapper;

    public ModelService(BiModelMapper biModelMapper) {
        this.biModelMapper = biModelMapper;
    }

    public List<BiModel> list() { return biModelMapper.listAll(); }

    public BiModel getById(Long id) { return biModelMapper.findById(id); }

    public BiModel create(CreateModelRequest req) {
        BiModel m = new BiModel();
        m.setName(req.getName());
        m.setDescription(req.getDescription());
        m.setConfigJson(req.getConfigJson());
        biModelMapper.insert(m);
        return m;
    }

    public BiModel update(Long id, UpdateModelRequest req) {
        BiModel m = biModelMapper.findById(id);
        if (m == null) throw new IllegalArgumentException("Model not found: " + id);
        m.setName(req.getName());
        m.setDescription(req.getDescription());
        m.setConfigJson(req.getConfigJson());
        biModelMapper.update(m);
        return m;
    }

    public void delete(Long id) { biModelMapper.deleteById(id); }
}
