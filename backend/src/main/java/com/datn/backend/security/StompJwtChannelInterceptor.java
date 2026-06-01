package com.datn.backend.security;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;

import io.jsonwebtoken.Claims;

// Xác thực JWT ở STOMP CONNECT frame (handshake SockJS là anonymous)
@Component
public class StompJwtChannelInterceptor implements ChannelInterceptor {

    private static final Logger log = LoggerFactory.getLogger(StompJwtChannelInterceptor.class);
    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtUtil jwtUtil;

    public StompJwtChannelInterceptor(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || !StompCommand.CONNECT.equals(accessor.getCommand())) {
            return message;
        }

        String authHeader = accessor.getFirstNativeHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith(BEARER_PREFIX)) {
            log.warn("STOMP CONNECT thiếu Authorization header");
            throw new MessagingException("Thiếu JWT trong STOMP CONNECT");
        }

        try {
            Claims claims = jwtUtil.parse(authHeader.substring(BEARER_PREFIX.length()));
            Long uid = claims.get("uid", Long.class);
            String role = claims.get("role", String.class);
            if (uid == null || role == null) {
                throw new MessagingException("Token thiếu uid hoặc role");
            }

            StompPrincipal principal = new StompPrincipal(uid.toString());
            var authorities = List.of(new SimpleGrantedAuthority("ROLE_" + role));
            UsernamePasswordAuthenticationToken auth =
                    new UsernamePasswordAuthenticationToken(principal, null, authorities);

            accessor.setUser(auth);
            accessor.setLeaveMutable(true);
            return message;
        } catch (MessagingException ex) {
            throw ex;
        } catch (Exception ex) {
            log.warn("JWT trong STOMP CONNECT không hợp lệ: {}", ex.getMessage());
            throw new MessagingException("JWT không hợp lệ", ex);
        }
    }
}
