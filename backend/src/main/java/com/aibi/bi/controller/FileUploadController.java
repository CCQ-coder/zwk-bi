package com.aibi.bi.controller;

import com.aibi.bi.common.ApiResponse;
import com.aibi.bi.auth.RequireRoles;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/upload")
public class FileUploadController {

    @Value("${app.upload.path:D:/bi/jpg}")
    private String uploadPath;

    @PostMapping("/image")
    @RequireRoles({"ADMIN", "ANALYST"})
    public ApiResponse<Map<String, String>> uploadImage(@RequestParam("file") MultipartFile file,
                                                        @RequestParam(value = "category", required = false) String category) throws IOException {
        String originalFilename = file.getOriginalFilename();
        String ext = originalFilename != null && originalFilename.contains(".")
                ? originalFilename.substring(originalFilename.lastIndexOf('.'))
                : ".jpg";
        String fileName = UUID.randomUUID().toString().replace("-", "") + ext;

        String normalizedCategory = normalizeCategory(category);
        Path targetDir = resolveUploadDirectory(normalizedCategory);
        Files.createDirectories(targetDir);

        File dest = targetDir.resolve(fileName).toFile();
        file.transferTo(dest);

        String url = "index".equals(normalizedCategory)
                ? "/uploads/index/" + fileName
                : "/uploads/" + fileName;
        return ApiResponse.ok(Map.of("url", url, "fileName", fileName));
    }

    private String normalizeCategory(String category) {
        return "index".equalsIgnoreCase(category) ? "index" : "";
    }

    private Path resolveUploadDirectory(String category) {
        Path baseDir = Paths.get(uploadPath).toAbsolutePath().normalize();
        if (!"index".equals(category)) {
            return baseDir;
        }
        Path parent = baseDir.getParent();
        return (parent == null ? baseDir : parent).resolve("index");
    }
}
