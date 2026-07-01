package com.datn.backend.dto;

import java.time.LocalDateTime;

// Thông tin người đang mượn — để người khác biết và liên hệ khi cần
public class CurrentBorrowerResponse {
    private final String userName;
    private final String userPhone;
    private final String buildingName;
    private final String room;
    private final LocalDateTime returnDateTime;

    public CurrentBorrowerResponse(String userName, String userPhone, String buildingName, String room, LocalDateTime returnDateTime) {
        this.userName = userName;
        this.userPhone = userPhone;
        this.buildingName = buildingName;
        this.room = room;
        this.returnDateTime = returnDateTime;
    }

    public String getUserName() { return userName; }
    public String getUserPhone() { return userPhone; }
    public String getBuildingName() { return buildingName; }
    public String getRoom() { return room; }
    public LocalDateTime getReturnDateTime() { return returnDateTime; }
}
