package com.safereport;

import org.springframework.boot.SpringApplication;
import java.util.TimeZone;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class SafeReportApplication {
    public static void main(String[] args) {
        TimeZone.setDefault(TimeZone.getTimeZone("UTC"));   // all timestamps are UTC
        SpringApplication.run(SafeReportApplication.class, args);
    }
}
