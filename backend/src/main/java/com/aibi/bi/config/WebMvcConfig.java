package com.aibi.bi.config;

import com.aibi.bi.auth.JwtAuthInterceptor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.nio.file.Paths;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    private final JwtAuthInterceptor jwtAuthInterceptor;

    @Value("${app.upload.path:D:/bi/jpg}")
    private String uploadPath;

    public WebMvcConfig(JwtAuthInterceptor jwtAuthInterceptor) {
        this.jwtAuthInterceptor = jwtAuthInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(jwtAuthInterceptor).addPathPatterns("/api/**");
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String indexResourcePath = toResourcePath(resolveUploadDirectory("index"));
        String defaultResourcePath = toResourcePath(resolveUploadDirectory(""));
        registry.addResourceHandler("/uploads/index/**")
                .addResourceLocations(indexResourcePath);
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(defaultResourcePath);
    }

    private Path resolveUploadDirectory(String category) {
        Path baseDir = Paths.get(uploadPath).toAbsolutePath().normalize();
        if (!"index".equalsIgnoreCase(category)) {
            return baseDir;
        }
        Path parent = baseDir.getParent();
        return (parent == null ? baseDir : parent).resolve("index");
    }

    private String toResourcePath(Path directory) {
        String resourcePath = "file:" + directory.toString().replace("\\", "/");
        if (!resourcePath.endsWith("/")) {
            resourcePath += "/";
        }
        return resourcePath;
    }
}
