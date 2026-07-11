package com.docsearch.service;

import com.docsearch.dto.UserDTO;
import com.docsearch.entity.User;
import com.docsearch.exception.ResourceNotFoundException;
import com.docsearch.exception.UnauthorizedException;
import com.docsearch.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public List<UserDTO> getAllUsers() {
        return userRepository.findAll()
                .stream()
                .map(UserDTO::fromEntity)
                .collect(Collectors.toList());
    }

    public UserDTO getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
        return UserDTO.fromEntity(user);
    }

    public UserDTO getUserByUsername(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", username));
        return UserDTO.fromEntity(user);
    }

    public void deleteUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));

        // Prevent deleting the last admin
        if ("ADMIN".equals(user.getRole())) {
            List<User> admins = userRepository.findByRole("ADMIN");
            if (admins.size() <= 1) {
                throw new UnauthorizedException("Cannot delete the last admin user");
            }
        }

        userRepository.delete(user);
    }

    public UserDTO getCurrentUser(String username) {
        return getUserByUsername(username);
    }
}
