package com.docsearch;

import com.docsearch.entity.User;
import com.docsearch.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;

@SpringBootApplication
public class DocSearchApplication {

    @Value("${admin.username:admin}")
    private String adminUsername;

    @Value("${admin.email:admin@docsearch.com}")
    private String adminEmail;

    @Value("${admin.password}")
    private String adminPassword;

    public static void main(String[] args) {
        SpringApplication.run(DocSearchApplication.class, args);
    }

    @Bean
    public CommandLineRunner initAdminUser(UserRepository userRepository,
                                           PasswordEncoder passwordEncoder) {

        return args -> {

            boolean adminExists = userRepository.findByRole("ADMIN")
                    .stream()
                    .findFirst()
                    .isPresent();

            if (!adminExists) {

                User admin = new User();
                admin.setUsername(adminUsername);
                admin.setEmail(adminEmail);
                admin.setPassword(passwordEncoder.encode(adminPassword));
                admin.setFullName("System Admin");
                admin.setRole("ADMIN");
                admin.setCreatedAt(LocalDateTime.now());

                userRepository.save(admin);

                System.out.println("======================================");
                System.out.println("Default ADMIN created successfully.");
                System.out.println("Username : " + adminUsername);
                System.out.println("======================================");
            }
        };
    }
}