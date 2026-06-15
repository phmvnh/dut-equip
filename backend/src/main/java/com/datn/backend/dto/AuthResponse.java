package com.datn.backend.dto;

import com.datn.backend.entity.User;
import com.datn.backend.enums.UserRole;

public class AuthResponse {

    private String token;
    private long expiresIn;
    private UserInfo user;

    public static AuthResponse of(String token, long expiresIn, User user) {
        AuthResponse r = new AuthResponse();
        r.token = token;
        r.expiresIn = expiresIn;
        r.user = UserInfo.from(user);
        return r;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public long getExpiresIn() {
        return expiresIn;
    }

    public void setExpiresIn(long expiresIn) {
        this.expiresIn = expiresIn;
    }

    public UserInfo getUser() {
        return user;
    }

    public void setUser(UserInfo user) {
        this.user = user;
    }

    public static class UserInfo {
        private Long id;
        private String fullName;
        private String email;
        private UserRole role;
        private String faculty;
        private String phone;
        private String avatarUrl;
        private String personalEmail;

        public static UserInfo from(User u) {
            UserInfo info = new UserInfo();
            info.id = u.getId();
            info.fullName = u.getFullName();
            info.email = u.getEmail();
            info.role = u.getRole();
            info.faculty = u.getFaculty();
            info.phone = u.getPhone();
            info.avatarUrl = u.getAvatarUrl();
            info.personalEmail = u.getPersonalEmail();
            return info;
        }

        public Long getId() {
            return id;
        }

        public void setId(Long id) {
            this.id = id;
        }

        public String getFullName() {
            return fullName;
        }

        public void setFullName(String fullName) {
            this.fullName = fullName;
        }

        public String getEmail() {
            return email;
        }

        public void setEmail(String email) {
            this.email = email;
        }

        public UserRole getRole() {
            return role;
        }

        public void setRole(UserRole role) {
            this.role = role;
        }

        public String getFaculty() {
            return faculty;
        }

        public void setFaculty(String faculty) {
            this.faculty = faculty;
        }

        public String getPhone() {
            return phone;
        }

        public void setPhone(String phone) {
            this.phone = phone;
        }

        public String getAvatarUrl() {
            return avatarUrl;
        }

        public void setAvatarUrl(String avatarUrl) {
            this.avatarUrl = avatarUrl;
        }

        public String getPersonalEmail() {
            return personalEmail;
        }

        public void setPersonalEmail(String personalEmail) {
            this.personalEmail = personalEmail;
        }
    }
}
