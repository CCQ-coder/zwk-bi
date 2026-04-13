package com.aibi.bi.mapper;

import com.aibi.bi.domain.BiModel;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface BiModelMapper {
    List<BiModel> listAll();
    BiModel findById(Long id);
    int insert(BiModel model);
    int update(BiModel model);
    int deleteById(Long id);
}
