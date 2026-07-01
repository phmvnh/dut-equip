package com.datn.backend.dto;

public class InventoryItemUpdateRequest {
    private boolean found;
    private String actualLocation;
    private String actualCondition;
    private String discrepancyNote;

    public boolean isFound() { return found; }
    public void setFound(boolean found) { this.found = found; }
    public String getActualLocation() { return actualLocation; }
    public void setActualLocation(String actualLocation) { this.actualLocation = actualLocation; }
    public String getActualCondition() { return actualCondition; }
    public void setActualCondition(String actualCondition) { this.actualCondition = actualCondition; }
    public String getDiscrepancyNote() { return discrepancyNote; }
    public void setDiscrepancyNote(String discrepancyNote) { this.discrepancyNote = discrepancyNote; }
}
