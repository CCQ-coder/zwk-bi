package com.aibi.bi.mapper;

import com.aibi.bi.domain.BiAuditLog;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface BiAuditLogMapper {
    List<BiAuditLog> listAll();

    List<BiAuditLog> listByFilter(@Param("username") String username,
                                  @Param("actionPrefix") String actionPrefix,
                                  @Param("limit") Integer limit);

    int insert(BiAuditLog log);
}
