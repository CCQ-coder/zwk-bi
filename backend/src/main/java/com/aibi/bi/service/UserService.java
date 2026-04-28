package com.aibi.bi.service;

import com.aibi.bi.model.request.CreateUserRequest;
import com.aibi.bi.model.request.UpdateUserRequest;
import com.aibi.bi.model.response.UserResponse;

import java.util.List;

public interface UserService {

    List<UserResponse> list();

    UserResponse create(CreateUserRequest request, String operator, String ipAddr);

    UserResponse update(Long id, UpdateUserRequest request, String operator, String ipAddr);

    void delete(Long id, String operator, String ipAddr);
}
