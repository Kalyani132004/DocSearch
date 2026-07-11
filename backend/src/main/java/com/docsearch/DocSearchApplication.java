package com.docsearch;

import com.docsearch.entity.User;
import com.docsearch.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;

@SpringBootApplication
public class DocSearchApplication {

    public static void main(String[] args) {
        SpringApplication.run(DocSearchApplication.class, args);
    }

    @Bean
    public CommandLineRunner initAdminUser(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            boolean adminExists = userRepository.findByRole("ADMIN")
                    .stream()
                    .findFirst()
                    .isPresent();

            if (!adminExists) {
                User admin = new User();
                admin.setUsername("admin");
                admin.setEmail("admin@docsearch.com");
                admin.setPassword(passwordEncoder.encode("admin123"));
                admin.setFullName("System Admin");
                admin.setRole("ADMIN");
                admin.setCreatedAt(LocalDateTime.now());
                userRepository.save(admin);
                System.out.println(">>> Default admin user created: username=admin, password=admin123");
            }
        };
    }
}
