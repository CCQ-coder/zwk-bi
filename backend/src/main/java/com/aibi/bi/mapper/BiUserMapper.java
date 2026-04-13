package com.aibi.bi.mapper;

import com.aibi.bi.domain.BiUser;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface BiUserMapper {
    List<BiUser> listAll();

    BiUser findById(Long id);

    BiUser findByUsername(String username);

    long countByUsername(String username);

    int insert(BiUser user);

    int update(BiUser user);

    int deleteById(Long id);
}
