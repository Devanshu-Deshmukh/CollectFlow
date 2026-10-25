package com.collectflow.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

@Getter
@Setter
@ConfigurationProperties(prefix = "app")
public class AppProperties {

    private final Jwt jwt = new Jwt();
    private final Cors cors = new Cors();
    private final Notifications notifications = new Notifications();
    private final Reminders reminders = new Reminders();
    private boolean seedDemoData;

    @Getter
    @Setter
    public static class Jwt {
        private String secret;
        private long ttlHours = 168;
    }

    @Getter
    @Setter
    public static class Cors {
        private List<String> allowedOrigins = List.of("http://localhost:5173");
    }

    @Getter
    @Setter
    public static class Notifications {
        private boolean emailEnabled;
        private String from = "no-reply@collectflow.app";
    }

    @Getter
    @Setter
    public static class Reminders {
        private String cron = "0 0 8 * * *";
        private int defaultRecoveryDays = 30;
    }
}
