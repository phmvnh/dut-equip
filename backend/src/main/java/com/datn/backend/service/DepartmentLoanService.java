package com.datn.backend.service;

import java.util.List;

import com.datn.backend.dto.DepartmentLoanCreateRequest;
import com.datn.backend.dto.DepartmentLoanResponse;
import com.datn.backend.dto.DepartmentLoanReturnRequest;

public interface DepartmentLoanService {

    List<DepartmentLoanResponse> getAll(String status);

    DepartmentLoanResponse getById(Long id);

    DepartmentLoanResponse create(DepartmentLoanCreateRequest req, Long adminId);

    DepartmentLoanResponse returnLoan(Long id, DepartmentLoanReturnRequest req);

    DepartmentLoanResponse cancel(Long id);
}
