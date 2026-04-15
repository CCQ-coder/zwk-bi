package com.aibi.bi.mapper;

import com.aibi.bi.domain.BiDatasetFolder;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface BiDatasetFolderMapper {
    List<BiDatasetFolder> listAll();
    BiDatasetFolder findById(Long id);
    int insert(BiDatasetFolder folder);
    int update(BiDatasetFolder folder);
    int deleteById(Long id);
}
