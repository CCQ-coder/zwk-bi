package com.aibi.bi.service;

import com.aibi.bi.domain.BiAuditLog;
import com.aibi.bi.domain.BiChart;
import com.aibi.bi.domain.BiDashboard;
import com.aibi.bi.domain.BiDataset;
import com.aibi.bi.domain.BiDatasource;
import com.aibi.bi.domain.SysMenu;
import com.aibi.bi.mapper.BiChartMapper;
import com.aibi.bi.mapper.BiDashboardMapper;
import com.aibi.bi.mapper.BiDatasetMapper;
import com.aibi.bi.mapper.BiDatasourceMapper;
import com.aibi.bi.model.response.WorkbenchLoginOverviewResponse;
import com.aibi.bi.model.response.WorkbenchLoginTrendResponse;
import com.aibi.bi.model.response.WorkbenchOverviewResponse;
import com.aibi.bi.model.response.WorkbenchScreenSummaryResponse;
import com.aibi.bi.model.response.WorkbenchSummaryResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

@Service
public class WorkbenchOverviewServiceImpl implements WorkbenchOverviewService {

    private static final int RECENT_WINDOW_DAYS = 7;
    private static final int LOGIN_LOG_LIMIT = 1000;
    private static final String LOGIN_LOG_MENU_PATH = "/home/system/login-logs";

    private final BiDatasourceMapper datasourceMapper;
    private final BiDatasetMapper datasetMapper;
    private final BiChartMapper chartMapper;
    private final BiDashboardMapper dashboardMapper;
    private final AuditLogService auditLogService;
    private final MenuService menuService;
    private final ObjectMapper objectMapper;

    public WorkbenchOverviewServiceImpl(BiDatasourceMapper datasourceMapper,
                                        BiDatasetMapper datasetMapper,
                                        BiChartMapper chartMapper,
                                        BiDashboardMapper dashboardMapper,
                                        AuditLogService auditLogService,
                                        MenuService menuService,
                                        ObjectMapper objectMapper) {
        this.datasourceMapper = datasourceMapper;
        this.datasetMapper = datasetMapper;
        this.chartMapper = chartMapper;
        this.dashboardMapper = dashboardMapper;
        this.auditLogService = auditLogService;
        this.menuService = menuService;
        this.objectMapper = objectMapper;
    }

    @Override
    public WorkbenchOverviewResponse getOverview(Long userId, String role) {
        LocalDateTime recentSince = LocalDateTime.now().minusDays(RECENT_WINDOW_DAYS);
        List<BiDatasource> datasources = datasourceMapper.listAll();
        List<BiDataset> datasets = datasetMapper.listAll();
        List<BiChart> charts = chartMapper.listAll();
        List<BiDashboard> dashboards = dashboardMapper.listAll();

        List<WorkbenchScreenSummaryResponse> screens = dashboards.stream()
                .map(this::toScreenSummary)
                .filter(Objects::nonNull)
                .sorted(Comparator
                        .comparing(WorkbenchScreenSummaryResponse::createdAt,
                                Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(WorkbenchScreenSummaryResponse::id, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();

        int recentDatasourceCount = countRecent(datasources.stream().map(BiDatasource::getCreatedAt).toList(), recentSince);
        int recentDatasetCount = countRecent(datasets.stream().map(BiDataset::getCreatedAt).toList(), recentSince);
        int recentChartCount = countRecent(charts.stream().map(BiChart::getCreatedAt).toList(), recentSince);
        int recentScreenCount = countRecent(screens.stream().map(WorkbenchScreenSummaryResponse::createdAt).toList(), recentSince);
        int publishedScreenCount = (int) screens.stream()
                .filter(screen -> "PUBLISHED".equalsIgnoreCase(screen.publishStatus()))
                .count();

        WorkbenchSummaryResponse summary = new WorkbenchSummaryResponse(
                datasources.size(),
                datasets.size(),
                charts.size(),
                screens.size(),
                publishedScreenCount,
                recentDatasourceCount,
                recentDatasetCount,
                recentChartCount,
                recentScreenCount,
                recentDatasourceCount + recentDatasetCount + recentChartCount + recentScreenCount
        );

        WorkbenchLoginOverviewResponse login = buildLoginOverview(userId, role, recentSince);
        return new WorkbenchOverviewResponse(summary, login, screens);
    }

    private WorkbenchLoginOverviewResponse buildLoginOverview(Long userId, String role, LocalDateTime recentSince) {
        if (!canReadLoginOverview(userId, role)) {
            return new WorkbenchLoginOverviewResponse(false, 0, 0, 0, List.of());
        }

        List<BiAuditLog> recentLogs = auditLogService.listLogin(null, LOGIN_LOG_LIMIT).stream()
                .filter(log -> log.getCreatedAt() != null && !log.getCreatedAt().isBefore(recentSince))
                .toList();

        int successCount = (int) recentLogs.stream().filter(log -> "LOGIN_SUCCESS".equalsIgnoreCase(log.getAction())).count();
        int failCount = (int) recentLogs.stream().filter(log -> "LOGIN_FAIL".equalsIgnoreCase(log.getAction())).count();
        int activeUserCount = (int) recentLogs.stream()
                .map(BiAuditLog::getUsername)
                .filter(StringUtils::hasText)
                .map(String::trim)
                .distinct()
                .count();

        return new WorkbenchLoginOverviewResponse(
                true,
                successCount,
                failCount,
                activeUserCount,
                buildLoginTrend(recentLogs)
        );
    }

    private boolean canReadLoginOverview(Long userId, String role) {
        if (userId == null || !"ADMIN".equalsIgnoreCase(role)) {
            return false;
        }
        return containsMenuPath(menuService.listCurrentMenus(userId), LOGIN_LOG_MENU_PATH);
    }

    private boolean containsMenuPath(List<SysMenu> menus, String path) {
        for (SysMenu menu : menus) {
            if (path.equals(menu.getPath())) {
                return true;
            }
            if (menu.getChildren() != null && containsMenuPath(menu.getChildren(), path)) {
                return true;
            }
        }
        return false;
    }

    private List<WorkbenchLoginTrendResponse> buildLoginTrend(List<BiAuditLog> recentLogs) {
        LocalDate today = LocalDate.now();
        Map<LocalDate, TrendBucket> bucketMap = new LinkedHashMap<>();
        for (int index = RECENT_WINDOW_DAYS - 1; index >= 0; index--) {
            LocalDate day = today.minusDays(index);
            bucketMap.put(day, new TrendBucket(day));
        }

        for (BiAuditLog log : recentLogs) {
            if (log.getCreatedAt() == null) {
                continue;
            }
            TrendBucket bucket = bucketMap.get(log.getCreatedAt().toLocalDate());
            if (bucket == null) {
                continue;
            }
            if ("LOGIN_SUCCESS".equalsIgnoreCase(log.getAction())) {
                bucket.success += 1;
            } else if ("LOGIN_FAIL".equalsIgnoreCase(log.getAction())) {
                bucket.fail += 1;
            }
        }

        List<WorkbenchLoginTrendResponse> trend = new ArrayList<>(bucketMap.size());
        for (TrendBucket bucket : bucketMap.values()) {
            trend.add(new WorkbenchLoginTrendResponse(
                    bucket.day.toString(),
                    bucket.day.getMonthValue() + "/" + bucket.day.getDayOfMonth(),
                    bucket.success,
                    bucket.fail,
                    bucket.success + bucket.fail
            ));
        }
        return trend;
    }

    private WorkbenchScreenSummaryResponse toScreenSummary(BiDashboard dashboard) {
        JsonNode config = parseConfig(dashboard.getConfigJson());
        String scene = config.path("scene").asText("dashboard");
        if (!"screen".equalsIgnoreCase(scene)) {
            return null;
        }
        JsonNode publish = config.path("publish");
        String publishStatus = "PUBLISHED".equalsIgnoreCase(publish.path("status").asText())
                ? "PUBLISHED"
                : "DRAFT";
        JsonNode canvas = config.path("canvas");
        int canvasWidth = normalizeCanvasSide(canvas.path("width").asInt(1920), 1920, 960);
        int canvasHeight = normalizeCanvasSide(canvas.path("height").asInt(1080), 1080, 540);
        String coverUrl = blankToEmpty(config.path("cover").path("url").asText(""));
        return new WorkbenchScreenSummaryResponse(
                dashboard.getId(),
                dashboard.getName(),
                publishStatus,
                coverUrl,
                canvasWidth,
                canvasHeight,
                Math.max(0, dashboard.getComponentCount() == null ? 0 : dashboard.getComponentCount()),
                dashboard.getCreatedAt()
        );
    }

    private int normalizeCanvasSide(int value, int fallback, int min) {
        return Math.max(min, value > 0 ? value : fallback);
    }

    private int countRecent(List<LocalDateTime> timestamps, LocalDateTime recentSince) {
        return (int) timestamps.stream()
                .filter(Objects::nonNull)
                .filter(timestamp -> !timestamp.isBefore(recentSince))
                .count();
    }

    private JsonNode parseConfig(String configJson) {
        try {
            return objectMapper.readTree(StringUtils.hasText(configJson) ? configJson : "{}");
        } catch (Exception ex) {
            return objectMapper.createObjectNode();
        }
    }

    private String blankToEmpty(String value) {
        return value == null ? "" : value.trim();
    }

    private static final class TrendBucket {
        private final LocalDate day;
        private int success;
        private int fail;

        private TrendBucket(LocalDate day) {
            this.day = day;
        }
    }
}