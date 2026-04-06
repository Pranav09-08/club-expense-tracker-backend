# Club Expense Tracker API Documentation

## Base URL
`http://localhost:5001/api`

## Auth Header
For protected routes:
`Authorization: Bearer <accessToken>`

---

## Authentication APIs

### Login
`POST /auth/login`

Request body:
```json
{
  "email": "admin@club.in",
  "password": "YourPassword123",
  "roleCode": "ADMIN",
  "clubId": null
}
```

Notes:
- `roleCode` is optional.
- `clubId` is required only for club-scoped roles.
- If not provided, the first assigned role is used.

Response:
```json
{
  "message": "Login successful",
  "user": {
    "id": 2,
    "fullName": "System Admin",
    "email": "admin@club.in"
  },
  "activeRole": {
    "roleCode": "ADMIN",
    "scopeType": "GLOBAL",
    "clubId": null
  },
  "availableRoles": [
    {
      "roleCode": "ADMIN",
      "scopeType": "GLOBAL",
      "clubId": null
    }
  ],
  "accessToken": "<jwt-token>"
}
```

### Current User
`GET /auth/me`

Response:
```json
{
  "user": {
    "id": 2,
    "fullName": "System Admin",
    "email": "admin@club.in",
    "status": "ACTIVE"
  },
  "roles": [
    {
      "roleCode": "ADMIN",
      "scopeType": "GLOBAL",
      "clubId": null
    }
  ],
  "tokenContext": {
    "activeRole": "ADMIN",
    "activeRoleScope": "GLOBAL",
    "activeClubId": null
  }
}
```

### Logout
`POST /auth/logout`

Response:
```json
{
  "message": "Logout successful"
}
```

---

## Admin APIs

### Create Club
`POST /admin/clubs`

Request body:
```json
{
  "clubCode": "tech_club",
  "clubName": "Tech Club",
  "description": "Handles technical events"
}
```

Response:
```json
{
  "message": "Club created successfully",
  "club": {
    "id": 1,
    "clubCode": "TECH_CLUB",
    "clubName": "Tech Club"
  }
}
```

### List Clubs
`GET /admin/clubs`

Response:
```json
{
  "message": "Clubs fetched successfully",
  "clubs": [
    {
      "id": 1,
      "club_code": "TECH_CLUB",
      "club_name": "Tech Club",
      "description": "Handles technical events",
      "is_active": true,
      "created_at": "2026-04-01T10:30:00.000Z"
    }
  ]
}
```

### Create Coordinator
`POST /admin/coordinators`

Request body:
```json
{
  "fullName": "Ravi Kumar",
  "email": "ravi.coordinator@club.in",
  "password": "SecurePass@123",
  "clubId": 1
}
```

Response:
```json
{
  "message": "Coordinator created successfully",
  "user": {
    "id": 3,
    "full_name": "Ravi Kumar",
    "email": "ravi.coordinator@club.in"
  },
  "assignedRole": {
    "roleCode": "COORDINATOR",
    "clubId": 1
  }
}
```

### List Coordinators in Club
`GET /admin/clubs/:clubId/coordinators`

Response:
```json
{
  "message": "Coordinators fetched successfully",
  "coordinators": [
    {
      "id": 3,
      "full_name": "Ravi Kumar",
      "email": "ravi.coordinator@club.in",
      "joined_at": "2026-04-01T10:45:00.000Z"
    }
  ]
}
```

---

## Coordinator APIs

### Create Lead
`POST /coordinator/leads`

Request body:
```json
{
  "fullName": "Anita Sharma",
  "email": "anita.lead@club.in",
  "password": "LeadPass@123",
  "roleCode": "STUDENT_LEAD"
}
```

Allowed `roleCode` values:
- `FINANCE_LEAD`
- `STUDENT_LEAD`

Response:
```json
{
  "message": "Lead created successfully",
  "user": {
    "id": 4,
    "full_name": "Anita Sharma",
    "email": "anita.lead@club.in"
  },
  "assignedRole": {
    "roleCode": "STUDENT_LEAD",
    "clubId": 1
  }
}
```

### List Leads in Club
`GET /coordinator/leads`

Response:
```json
{
  "message": "Leads fetched successfully",
  "leads": [
    {
      "id": 4,
      "full_name": "Anita Sharma",
      "email": "anita.lead@club.in",
      "role_code": "STUDENT_LEAD",
      "joined_at": "2026-04-01T11:15:00.000Z"
    }
  ]
}
```

---

## Member APIs

### Create Expense
`POST /member/expenses`

Request body:
```json
{
  "title": "Printing for workshop",
  "description": "Printed 100 handouts for the event",
  "expenseDate": "2026-04-01",
  "categoryCode": "OTHER",
  "amount": 500,
  "lineItems": [
    {
      "itemName": "A4 printouts",
      "quantity": 100,
      "unitPrice": 5,
      "totalPrice": 500,
      "note": "Black and white"
    }
  ]
}
```

Response:
```json
{
  "message": "Expense created successfully",
  "expense": {
    "id": 12,
    "clubId": 1,
    "title": "Printing for workshop",
    "status": "SUBMITTED"
  }
}
```

### List My Expenses
`GET /member/expenses`

Response:
```json
{
  "message": "Expenses fetched successfully",
  "expenses": [
    {
      "id": 12,
      "title": "Printing for workshop",
      "description": "Printed 100 handouts for the event",
      "expense_date": "2026-04-01",
      "amount": "500.00",
      "currency": "INR",
      "status": "SUBMITTED",
      "submitted_at": "2026-04-01T10:00:00.000Z",
      "approved_at": null,
      "rejected_at": null,
      "rejection_reason": null,
      "category_code": "OTHER",
      "category_name": "Other"
    }
  ]
}
```

### Create Stationery Request
`POST /member/stationery-requests`

Request body:
```json
{
  "requestTitle": "Stationery for workshop",
  "requestReason": "Need pens and notebooks for attendees",
  "requiredByDate": "2026-04-05",
  "items": [
    {
      "itemName": "Notebook",
      "quantity": 20,
      "estimatedUnitPrice": 30,
      "estimatedTotalPrice": 600,
      "note": "A5 size"
    }
  ]
}
```

Response:
```json
{
  "message": "Stationery request created successfully",
  "request": {
    "id": 7,
    "clubId": 1,
    "requestTitle": "Stationery for workshop",
    "status": "SUBMITTED"
  }
}
```

---

## Finance Lead APIs

### List Club Expenses
`GET /finance-lead/expenses`

Response:
```json
{
  "message": "Expenses fetched successfully",
  "expenses": [
    {
      "id": 12,
      "title": "Printing for workshop",
      "description": "Printed 100 handouts for the event",
      "expense_date": "2026-04-01",
      "amount": "500.00",
      "currency": "INR",
      "status": "SUBMITTED",
      "submitted_at": "2026-04-01T10:00:00.000Z",
      "approved_at": null,
      "rejected_at": null,
      "rejection_reason": null,
      "submitted_by_name": "Member One",
      "submitted_by_email": "member.one@club.in",
      "category_code": "OTHER",
      "category_name": "Other"
    }
  ]
}
```

### Approve/Reject Expense
`PATCH /finance-lead/expenses/:expenseId/decision`

Request body:
```json
{
  "decision": "APPROVED",
  "comment": "Looks good"
}
```

Allowed values for `decision`:
- `APPROVED`
- `REJECTED`

Response:
```json
{
  "message": "Expense decision saved successfully",
  "expenseId": 12,
  "decision": "APPROVED"
}
```

---

## Stationary Admin APIs

### List Stationery Requests
`GET /stationary-admin/requests`

Response:
```json
{
  "message": "Stationery requests fetched successfully",
  "requests": [
    {
      "id": 7,
      "request_title": "Stationery for workshop",
      "request_reason": "Need pens and notebooks for attendees",
      "required_by_date": "2026-04-05",
      "status": "SUBMITTED",
      "approved_at": null,
      "rejected_at": null,
      "rejection_reason": null,
      "invoice_number": null,
      "invoice_url": null,
      "final_amount": null,
      "requested_by_name": "Member One",
      "requested_by_email": "member.one@club.in"
    }
  ]
}
```

### Approve/Reject Stationery Request
`PATCH /stationary-admin/requests/:requestId/decision`

Request body:
```json
{
  "decision": "APPROVED",
  "comment": "Approved for purchase",
  "invoiceNumber": "INV-1024",
  "invoiceUrl": "https://example.com/invoice.pdf",
  "finalAmount": 580
}
```

Allowed values for `decision`:
- `APPROVED`
- `REJECTED`

Response:
```json
{
  "message": "Stationery request decision saved successfully",
  "requestId": 7,
  "decision": "APPROVED"
}
```

---

## End-to-End Flow
1. Admin logs in.
2. Admin creates club.
3. Admin creates coordinator for that club.
4. Coordinator logs in with club role.
5. Coordinator creates finance lead and student lead.
6. Student lead logs in with club role.
7. Student lead creates members.
8. Member logs in with club role.
9. Member creates expense and stationery request.
10. Finance lead approves or rejects expense.
11. Stationary admin approves or rejects stationery request.

---

## Important Notes
- Club-scoped roles require `activeClubId` in the access token payload.
- All protected routes require `Authorization: Bearer <accessToken>`.
- Emails are unique across the system.
- Access token is the only token used in this backend flow.
