package com.datn.backend.service.impl;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import com.datn.backend.service.EmailService;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

import java.io.UnsupportedEncodingException;

@Service
public class EmailServiceImpl implements EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailServiceImpl.class);

    private static final String FROM_NAME = "DUT Equip";

    private final JavaMailSender mailSender;
    private final String from;
    private final boolean enabled;

    public EmailServiceImpl(JavaMailSender mailSender,
                            @Value("${app.mail.from}") String from,
                            @Value("${app.mail.enabled}") boolean enabled) {
        this.mailSender = mailSender;
        this.from = from;
        this.enabled = enabled;
    }

    @Override
    @Async
    public void sendNotification(String to, String title, String message) {
        if (!enabled) {
            log.info("Mail đang tắt (app.mail.enabled=false), bỏ qua email tới {}", to);
            return;
        }
        try {
            MimeMessage mime = mailSender.createMimeMessage();
            // multipart=true → gửi kèm cả bản text thuần lẫn HTML, giảm điểm spam
            MimeMessageHelper helper = new MimeMessageHelper(mime, true, "UTF-8");
            helper.setFrom(from, FROM_NAME);
            helper.setTo(to);
            helper.setSubject(title);
            helper.setText(buildText(title, message), buildHtml(title, message));
            mailSender.send(mime);
            log.debug("Đã gửi email thông báo tới {}", to);
        } catch (MailException | MessagingException | UnsupportedEncodingException e) {
            log.warn("Gửi email thông báo tới {} thất bại: {}", to, e.getMessage());
        }
    }

    private String buildText(String title, String message) {
        return title + "\n\n" + message + "\n\n—\nDUT Equip — email tự động, vui lòng không trả lời.";
    }

    private String buildHtml(String title, String message) {
        return "<div style=\"font-family:Arial,sans-serif;color:#1f2937;max-width:560px\">"
                + "<h3 style=\"color:#2563eb;margin-bottom:8px\">" + title + "</h3>"
                + "<p style=\"font-size:15px;line-height:1.5\">" + message + "</p>"
                + "<hr style=\"border:none;border-top:1px solid #e5e7eb;margin:16px 0\"/>"
                + "<p style=\"font-size:12px;color:#9ca3af\">DUT Equip — email tự động, vui lòng không trả lời.</p>"
                + "</div>";
    }
}
