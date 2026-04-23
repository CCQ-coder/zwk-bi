package com.aibi.bi.mapper;

import com.aibi.bi.domain.BiPublishGroupAssignment;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface BiPublishGroupAssignmentMapper {
    List<BiPublishGroupAssignment> listAll();

    int deleteByGroupId(Long groupId);

    int deleteByDashboardIds(@Param("dashboardIds") List<Long> dashboardIds);

    int insertBatch(@Param("groupId") Long groupId, @Param("dashboardIds") List<Long> dashboardIds);
}