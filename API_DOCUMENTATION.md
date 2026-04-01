# Club Expense Tracker - API Documentation

## Base URL
```
http://localhost:5001/api
```

---

## 🔐 Authentication APIs

### 1. Login
**Endpoint:** `POST /auth/login`

**Description:** User login with email and password. Returns access token and user details.

**Request Body:**
```json
{
  "email": "admin@club.in",
  "password": "YourPassword123",
  "roleCode": "ADMIN",
  "clubId": null
}
```

**Request Body Notes:**
- `email` (required): User's email
- `password` (required): User's password
- `roleCode` (optional): Specific role to activate (e.g., "ADMIN", "COORDINATOR", "STUDENT_LEAD", "FINANCE_LEAD", "MEMBER")
- `clubId` (optional): Club ID for club-scoped roles (only for COORDINATOR, STUDENT_LEAD, FINANCE_LEAD, MEMBER)
- If `roleCode` or `clubId` not provided, first assigned role is activated

**Response (200 OK):**
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
    },
    {
      "roleCode": "COORDINATOR",
      "scopeType": "CLUB",
      "clubId": 1
    }
  ],
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**
- `400 Bad Request`: Missing email or password
- `401 Unauthorized`: Invalid credentials
- `403 Forbidden`: Account is inactive/locked
- `403 Forbidden`: Requested role not assigned to user

---

### 2. Get Current User
**Endpoint:** `GET /auth/me`

**Description:** Fetch current logged-in user details and roles.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request Body:** None

**Response (200 OK):**
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
    },
    {
      "roleCode": "COORDINATOR",
      "scopeType": "CLUB",
      "clubId": 1
    }
  ],
  "tokenContext": {
    "activeRole": "ADMIN",
    "activeRoleScope": "GLOBAL",
    "activeClubId": null
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or expired token
- `404 Not Found`: User not found

---

### 3. Logout
**Endpoint:** `POST /auth/logout`

**Description:** Logout current user by invalidating access token.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request Body:** None

**Response (200 OK):**
```json
{
  "message": "Logout successful"
}
```

**Error Responses:**
- `400 Bad Request`: No active session token found
- `401 Unauthorized`: Invalid or expired token

---

## 👨‍💼 Admin APIs

### 1. Create Club
**Endpoint:** `POST /admin/clubs`

**Description:** Admin creates a new club.

**Headers:**
```
Authorization: Bearer <adminAccessToken>
```

**Request Body:**
```json
{
  "clubCode": "tech_club",
  "clubName": "Tech Club",
  "description": "Handles all technical events and workshops"
}
```

**Response (201 Created):**
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

**Error Responses:**
- `400 Bad Request`: Missing required fields (clubCode, clubName)
- `403 Forbidden`: Only admin can create clubs
- `409 Conflict`: Club code already exists

---

### 2. List All Clubs
**Endpoint:** `GET /admin/clubs`

**Description:** Admin lists all clubs.

**Headers:**
```
Authorization: Bearer <adminAccessToken>
```

**Request Body:** None

**Response (200 OK):**
```json
{
  "message": "Clubs fetched successfully",
  "clubs": [
    {
      "id": 1,
      "club_code": "TECH_CLUB",
      "club_name": "Tech Club",
      "description": "Handles all technical events",
      "is_active": true,
      "created_at": "2026-04-01T10:30:00.000Z"
    },
    {
      "id": 2,
      "club_code": "SPORTS_CLUB",
      "club_name": "Sports Club",
      "description": "Manages sports activities",
      "is_active": true,
      "created_at": "2026-04-01T11:00:00.000Z"
    }
  ]
}
```

**Error Responses:**
- `403 Forbidden`: Only admin can list clubs
- `401 Unauthorized`: Invalid token

---

### 3. Create Coordinator
**Endpoint:** `POST /admin/coordinators`

**Description:** Admin creates a coordinator for a specific club.

**Headers:**
```
Authorization: Bearer <adminAccessToken>
```

**Request Body:**
```json
{
  "fullName": "Ravi Kumar",
  "email": "ravi.coordinator@club.in",
  "password": "SecurePass@123",
  "clubId": 1
}
```

**Response (201 Created):**
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

**Error Responses:**
- `400 Bad Request`: Missing required fields
- `403 Forbidden`: Only admin can create coordinator
- `409 Conflict`: Email already exists

---

### 4. List Coordinators in Club
**Endpoint:** `GET /admin/clubs/:clubId/coordinators`

**Description:** Admin lists all coordinators for a specific club.

**Headers:**
```
Authorization: Bearer <adminAccessToken>
```

**URL Parameters:**
- `clubId` (required): Club ID

**Request Body:** None

**Response (200 OK):**
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

**Error Responses:**
- `403 Forbidden`: Only admin can list coordinators
- `401 Unauthorized`: Invalid token

---

## 👥 Coordinator APIs

### 1. Create Lead (Finance Lead or Student Lead)
**Endpoint:** `POST /coordinator/leads`

**Description:** Coordinator creates a finance lead or student lead for their club.

**Headers:**
```
Authorization: Bearer <coordinatorAccessToken>
Content-Type: application/json
```

**Note:** The coordinatorAccessToken must have `activeClubId` set in its payload (login with roleCode and clubId for coordinator).

**Request Body:**
```json
{
  "fullName": "Anita Sharma",
  "email": "anita.lead@club.in",
  "password": "LeadPass@123",
  "roleCode": "STUDENT_LEAD"
}
```

**Request Body Notes:**
- `fullName` (required): Lead's full name
- `email` (required): Lead's email
- `password` (required): Lead's password
- `roleCode` (required): Either "FINANCE_LEAD" or "STUDENT_LEAD"

**Response (201 Created):**
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

**Error Responses:**
- `400 Bad Request`: Missing required fields or invalid roleCode
- `400 Bad Request`: Coordinator token must include active club
- `403 Forbidden`: Only coordinator can create leads
- `409 Conflict`: Email already exists

---

### 2. List Leads in Club
**Endpoint:** `GET /coordinator/leads`

**Description:** Coordinator lists all leads (finance lead & student lead) in their club.

**Headers:**
```
Authorization: Bearer <coordinatorAccessToken>
```

**Request Body:** None

**Response (200 OK):**
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
    },
    {
      "id": 5,
      "full_name": "Priya Patel",
      "email": "priya.finance@club.in",
      "role_code": "FINANCE_LEAD",
      "joined_at": "2026-04-01T11:20:00.000Z"
    }
  ]
}
```

**Error Responses:**
- `400 Bad Request`: Coordinator token must include active club
- `403 Forbidden`: Only coordinator can view leads
- `401 Unauthorized`: Invalid token

---

## 👨‍🎓 Student Lead APIs

### 1. Create Member
**Endpoint:** `POST /student-lead/members`

**Description:** Student lead creates a member for their club.

**Headers:**
```
Authorization: Bearer <studentLeadAccessToken>
Content-Type: application/json
```

**Note:** The studentLeadAccessToken must have `activeClubId` set in its payload.

**Request Body:**
```json
{
  "fullName": "Vikram Singh",
  "email": "vikram.member@club.in",
  "password": "MemberPass@123"
}
```

**Response (201 Created):**
```json
{
  "message": "Member created successfully",
  "user": {
    "id": 6,
    "full_name": "Vikram Singh",
    "email": "vikram.member@club.in"
  },
  "assignedRole": {
    "roleCode": "MEMBER",
    "clubId": 1
  }
}
```

**Error Responses:**
- `400 Bad Request`: Missing required fields
- `400 Bad Request`: Student lead token must include active club
- `403 Forbidden`: Only student lead can create members
- `409 Conflict`: Email already exists

---

### 2. List Members in Club
**Endpoint:** `GET /student-lead/members`

**Description:** Student lead lists all members in their club.

**Headers:**
```
Authorization: Bearer <studentLeadAccessToken>
```

**Request Body:** None

**Response (200 OK):**
```json
{
  "message": "Members fetched successfully",
  "members": [
    {
      "id": 6,
      "full_name": "Vikram Singh",
      "email": "vikram.member@club.in",
      "joined_at": "2026-04-01T11:45:00.000Z"
    },
    {
      "id": 7,
      "full_name": "Neha Gupta",
      "email": "neha.member@club.in",
      "joined_at": "2026-04-01T12:00:00.000Z"
    }
  ]
}
```

**Error Responses:**
- `400 Bad Request`: Student lead token must include active club
- `403 Forbidden`: Only student lead can view members
- `401 Unauthorized`: Invalid token

---

## 📋 Complete Flow Example

### Step 1: Admin Login
```bash
POST /auth/login
{
  "email": "admin@club.in",
  "password": "AdminPassword123"
}
```
**Response:** Admin access token with ADMIN role

### Step 2: Admin Creates Club
```bash
POST /admin/clubs
Headers: Authorization: Bearer <admin-token>
{
  "clubCode": "tech_club",
  "clubName": "Tech Club",
  "description": "Technology club"
}
```
**Response:** Club ID = 1

### Step 3: Admin Creates Coordinator for Club
```bash
POST /admin/coordinators
Headers: Authorization: Bearer <admin-token>
{
  "fullName": "Ravi Kumar",
  "email": "ravi@club.in",
  "password": "CoordPass@123",
  "clubId": 1
}
```
**Response:** Coordinator user created

### Step 4: Coordinator Logs In
```bash
POST /auth/login
{
  "email": "ravi@club.in",
  "password": "CoordPass@123",
  "roleCode": "COORDINATOR",
  "clubId": 1
}
```
**Response:** Coordinator access token with activeClubId = 1

### Step 5: Coordinator Creates Student Lead
```bash
POST /coordinator/leads
Headers: Authorization: Bearer <coordinator-token>
{
  "fullName": "Anita Sharma",
  "email": "anita@club.in",
  "password": "LeadPass@123",
  "roleCode": "STUDENT_LEAD"
}
```
**Response:** Student lead user created

### Step 6: Student Lead Logs In
```bash
POST /auth/login
{
  "email": "anita@club.in",
  "password": "LeadPass@123",
  "roleCode": "STUDENT_LEAD",
  "clubId": 1
}
```
**Response:** Student lead access token with activeClubId = 1

### Step 7: Student Lead Creates Members
```bash
POST /student-lead/members
Headers: Authorization: Bearer <student-lead-token>
{
  "fullName": "Vikram Singh",
  "email": "vikram@club.in",
  "password": "MemberPass@123"
}
```
**Response:** Member user created

---

## 🔑 Authorization Header Format

All protected endpoints require:
```
Authorization: Bearer <accessToken>
```

Example:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwi...
```

---

## 📌 Important Notes

1. **Token Expiry:** Access tokens expire after 1 day (check JWT_ACCESS_EXPIRES_IN in .env)
2. **Role-Based Access:** All endpoints check the user's role and club membership
3. **Club Scoping:** COORDINATOR, STUDENT_LEAD, FINANCE_LEAD, and MEMBER roles are scoped to a specific club
4. **Email Uniqueness:** Emails must be unique across the system
5. **Active Club:** Club-scoped roles require activeClubId in the login token payload
6. **Role Hierarchy:** Only specified roles can perform certain operations (see authorization checks in each endpoint)
