package com.datn.backend.security;

import java.security.Principal;

// Principal cho STOMP session — name = userId dạng String để convertAndSendToUser route đúng
public class StompPrincipal implements Principal {

    private final String name;

    public StompPrincipal(String name) {
        this.name = name;
    }

    @Override
    public String getName() {
        return name;
    }
}
