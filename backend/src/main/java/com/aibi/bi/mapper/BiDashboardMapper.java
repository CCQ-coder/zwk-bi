package com.aibi.bi.mapper;

import com.aibi.bi.domain.BiDashboard;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface BiDashboardMapper {
    List<BiDashboard> listAll();

    List<BiDashboard> listPage(@Param("keyword") String keyword,
                               @Param("scene") String scene,
                               @Param("publishStatus") String publishStatus,
                               @Param("offset") int offset,
                               @Param("limit") int limit);

    long countPage(@Param("keyword") String keyword,
                   @Param("scene") String scene,
                   @Param("publishStatus") String publishStatus);

    BiDashboard findLatest();

    BiDashboard findById(Long id);

    void insert(BiDashboard dashboard);

    void update(BiDashboard dashboard);

    void deleteById(Long id);

    long countAll();
}
