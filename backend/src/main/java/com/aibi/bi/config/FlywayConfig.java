package com.aibi.bi.config;

import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Flyway migration strategy: repair (clear any failed entries) then migrate.
 * This ensures that if a previous migration failed (e.g. V14 DROP FOREIGN KEY
 * on a DB without the FK), Flyway can self-recover on next startup.
 */
@Configuration
public class FlywayConfig {

    @Bean
    public FlywayMigrationStrategy repairAndMigrateStrategy() {
        return flyway -> {
            flyway.repair();
            flyway.migrate();
        };
    }
}
