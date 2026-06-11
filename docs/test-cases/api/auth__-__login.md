# API Test Cases – User Login (EVOX-11)

## Feature Information

| Field    | Value                               |
| -------- | ----------------------------------- |
| Feature  | User Login                          |
| Module   | User/Auth                           |
| Priority | P0 - Critical                       |
| Status   | VERIFIED by Gary Aure on 2026-04-27 |
| Ticket   | EVOX-11                             |

---

## Test Generation Instructions

### Authentication Requirements

All endpoints protected by `auth.apikey` MUST include:

```http
X-Authorization: <VALID_API_KEY>
```

Endpoints protected by `jwtauth` MUST include:

```http
Authorization: Bearer <JWT_TOKEN>
```

Endpoints protected by both middlewares MUST include both headers.

### Middleware Coverage Requirements

For every endpoint protected by `auth.apikey`, generate tests for:

1. Valid API key
2. Missing `X-Authorization` header
3. Invalid `X-Authorization` header

For every endpoint protected by `jwtauth`, generate tests for:

1. Valid JWT
2. Missing JWT
3. Invalid JWT
4. Expired JWT

### Default Request Headers

```json
{
  "Accept": "application/json",
  "Content-Type": "application/json",
  "X-Authorization": "<VALID_API_KEY>"
}
```

---

# Test Data Matrix

| User Type                        | Username      | Email                                               | Password           | is_active | termination_date | force_change_password |
| -------------------------------- | ------------- | --------------------------------------------------- | ------------------ | --------- | ---------------- | --------------------- |
| Active User                      | active.user   | [active@company.com](mailto:active@company.com)     | CorrectPassword123 | true      | NULL             | false                 |
| Force Password User              | force.user    | [force@company.com](mailto:force@company.com)       | CorrectPassword123 | true      | NULL             | true                  |
| Inactive User (Expired)          | inactive.user | [inactive@company.com](mailto:inactive@company.com) | CorrectPassword123 | false     | 3 days ago       | false                 |
| Inactive User (Grace Period)     | grace.user    | [grace@company.com](mailto:grace@company.com)       | CorrectPassword123 | false     | today            | false                 |
| Inactive User (NULL Termination) | nullterm.user | [nullterm@company.com](mailto:nullterm@company.com) | CorrectPassword123 | false     | NULL             | false                 |

---

# Standard Login API

## Endpoint

POST `/api/auth/login`

---

## LOGIN-001 Successful Login Using Username

### Preconditions

* User exists
* User is active
* Password is correct

### Request

```json
{
  "username": "active.user",
  "password": "CorrectPassword123"
}
```

### Expected Result

#### HTTP Status

```http
200 OK
```

#### Assertions

* access_token exists
* session_id exists
* user object returned
* constants returned
* settings returned
* token_type returned
* expires_in returned
* activity log created
* audit trail created

---

## LOGIN-002 Successful Login Using Email

### Request

```json
{
  "username": "active@company.com",
  "password": "CorrectPassword123"
}
```

### Expected Result

```http
200 OK
```

### Assertions

* User lookup performed by email
* JWT generated
* User payload returned

---

## LOGIN-003 Username Required

### Request

```json
{
  "password": "CorrectPassword123"
}
```

### Expected Result

```http
422 Unprocessable Entity
```

### Assertions

Validation error for username.

---

## LOGIN-004 Password Required

### Request

```json
{
  "username": "active.user"
}
```

### Expected Result

```http
422 Unprocessable Entity
```

### Assertions

Validation error for password.

---

## LOGIN-005 User Not Found By Username

### Request

```json
{
  "username": "unknown.user",
  "password": "CorrectPassword123"
}
```

### Expected Result

```http
401 Unauthorized
```

### Assertions

```json
{
  "message": "user_name_not_found"
}
```

---

## LOGIN-006 User Not Found By Email

### Request

```json
{
  "username": "missing@company.com",
  "password": "CorrectPassword123"
}
```

### Expected Result

```http
401 Unauthorized
```

### Assertions

```json
{
  "message": "user_email_not_found"
}
```

---

## LOGIN-007 Incorrect Password

### Request

```json
{
  "username": "active.user",
  "password": "WrongPassword"
}
```

### Expected Result

```http
401 Unauthorized
```

### Assertions

```json
{
  "message": "user_password_incorrect"
}
```

---

## LOGIN-008 Inactive User Beyond Grace Period

### Preconditions

```text
is_active=false
termination_date = current_date - 3 days
```

### Expected Result

```http
401 Unauthorized
```

### Assertions

```json
{
  "message": "user_not_active"
}
```

---

## LOGIN-009 Inactive User Within Grace Period

### Preconditions

```text
is_active=false
termination_date=today
```

### Expected Result

```http
200 OK
```

### Assertions

* Login allowed
* JWT generated

---

## LOGIN-010 Force Change Password User

### Preconditions

```text
force_change_password=true
```

### Expected Result

```http
200 OK
```

### Assertions

* Login succeeds
* force_change_password flag returned
* Frontend can redirect to password change page

---

## LOGIN-011 Verify JWT Expiry Value

### Expected Result

```http
200 OK
```

### Assertions

* expires_in matches configured JWT_TTL
* Default value = 60 minutes

---

## LOGIN-012 Activity Logging

### Expected Result

After successful login:

### Assertions

* log_activity("Login") executed
* Audit trail record created

---

## LOGIN-013 Multiple Consecutive Failed Logins

### Steps

Submit invalid password 20 times.

### Expected Result

### Assertions

* No rate limiting enforced
* All requests processed
* Consistent error returned

---

## LOGIN-014 Email Detection Logic

### Request

```json
{
  "username": "active@company.com",
  "password": "CorrectPassword123"
}
```

### Assertions

* Query performed using email field
* Username field not queried

---

## LOGIN-015 Username Detection Logic

### Request

```json
{
  "username": "active.user",
  "password": "CorrectPassword123"
}
```

### Assertions

* Query performed using username field

---

## LOGIN-016 Known Bug Verification

### Preconditions

```text
is_active=false
termination_date=NULL
```

### Expected Result (Current Behavior)

Document current behavior.

### Assertions

* Verify whether login succeeds
* Verify Carbon::parse(NULL)->addDay() behavior
* Mark as known defect if authentication passes

---

# Mobile Login API

## Endpoint

POST `/api/auth/login-mobile`

---

## MOBILE-001 Successful Mobile Login

### Preconditions

Valid active user.

### Expected Result

```http
200 OK
```

### Assertions

* JWT generated
* LoginLog record created

---

## MOBILE-002 LoginLog Created

### Assertions

Database contains:

```text
LoginLog
```

with:

* user_id
* login timestamp
* device information (if available)

---

## MOBILE-003 Invalid Password

### Expected Result

```http
401 Unauthorized
```

### Assertions

```json
{
  "message": "user_password_incorrect"
}
```

---

# Microsoft OAuth Login

## Endpoint

GET `/api/auth/authenticate-ms-client`

---

## MS-001 Missing Authorization Code

### Request

```http
GET /api/auth/authenticate-ms-client
```

### Expected Result

```http
400 Bad Request
```

### Assertions

```json
{
  "message": "Authorization code missing"
}
```

---

## MS-002 Microsoft Token Exchange Failure

### Preconditions

Mock Microsoft token endpoint failure.

### Expected Result

```http
401 Unauthorized
```

### Assertions

```json
{
  "message": "Microsoft login failed (token error)"
}
```

---

## MS-003 Microsoft User Fetch Failure

### Preconditions

Token exchange succeeds.

Mock Graph /me failure.

### Expected Result

```http
401 Unauthorized
```

### Assertions

```json
{
  "message": "Microsoft login failed (user fetch error)"
}
```

---

## MS-004 User Found Using mail Field

### Preconditions

Microsoft response:

```json
{
  "mail": "active@company.com"
}
```

### Expected Result

```http
200 OK
```

### Assertions

* User lookup uses mail value

---

## MS-005 User Found Using userPrincipalName

### Preconditions

```json
{
  "mail": null,
  "userPrincipalName": "active@company.com"
}
```

### Expected Result

```http
200 OK
```

### Assertions

* userPrincipalName fallback used

---

## MS-006 User Not Found

### Preconditions

Email not present in database.

### Expected Result

```http
401 Unauthorized
```

### Assertions

```json
{
  "message": "user_email_not_found"
}
```

---

## MS-007 Auth Login Failure

### Preconditions

auth()->login() returns false.

### Expected Result

```http
401 Unauthorized
```

### Assertions

```json
{
  "message": "user_not_found"
}
```

---

## MS-008 Inactive User Beyond Grace Period

### Expected Result

```http
401 Unauthorized
```

### Assertions

```json
{
  "message": "user_not_active"
}
```

---

## MS-009 Inactive User Within Grace Period

### Expected Result

```http
200 OK
```

### Assertions

JWT generated successfully.

---

## MS-010 Successful Microsoft Login

### Expected Result

```http
200 OK
```

### Assertions

Response contains:

```json
{
  "access_token": "...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

### Additional Assertions

* User payload NOT returned
* Frontend expected to call payload endpoint

---

# Payload API

## Endpoint

POST `/api/auth/payload`

---

## PAYLOAD-001 Valid JWT

### Expected Result

```http
200 OK
```

### Assertions

* User data returned
* Constants returned
* Settings returned

---

## PAYLOAD-002 Expired Token

### Expected Result

```http
401 Unauthorized
```

### Assertions

```json
{
  "message": "token_expired"
}
```

---

## PAYLOAD-003 Invalid Token

### Expected Result

```http
401 Unauthorized
```

### Assertions

```json
{
  "message": "token_invalid"
}
```

---

## PAYLOAD-004 Missing Token

### Expected Result

```http
401 Unauthorized
```

### Assertions

```json
{
  "message": "token_absent"
}
```

---

# Logout API

## Endpoint

POST `/api/auth/logout`

---

## LOGOUT-001 Successful Logout

### Expected Result

```http
200 OK
```

### Assertions

* JWT blacklisted
* Logout response returned

---

## LOGOUT-002 Reuse Blacklisted Token

### Steps

1. Login
2. Logout
3. Reuse token

### Expected Result

```http
401 Unauthorized
```

### Assertions

Token rejected.

---

# JWT Security Tests

## JWT-001 Token Expires After TTL

### Preconditions

JWT_TTL=60

### Assertions

Token invalid after expiration.

---

## JWT-002 Refresh TTL Boundary

### Preconditions

JWT_REFRESH_TTL=14 days

### Assertions

Token cannot be refreshed after refresh TTL.

---

## JWT-003 Blacklist Enforcement

### Preconditions

Token logged out.

### Assertions

Token reuse rejected.

---

# Middleware Tests

## MW-001 Missing API Key

### Expected Result

```http
401 Unauthorized
```

### Assertions

auth.apikey middleware blocks request.

---

## MW-002 Invalid API Key

### Expected Result

```http
401 Unauthorized
```

### Assertions

Request denied.

---

## MW-003 Protected Endpoint Without JWT

### Endpoint

```http
POST /api/auth/payload
POST /api/auth/logout
```

### Expected Result

```http
401 Unauthorized
```

### Assertions

```json
{
  "message": "token_absent"
}
```

---

# Coverage Summary

| Area                  | Covered |
| --------------------- | ------- |
| Username Login        | ✓       |
| Email Login           | ✓       |
| Validation            | ✓       |
| User Not Found        | ✓       |
| Wrong Password        | ✓       |
| Inactive Users        | ✓       |
| Grace Period Logic    | ✓       |
| NULL Termination Bug  | ✓       |
| Force Change Password | ✓       |
| Mobile Login          | ✓       |
| Microsoft OAuth       | ✓       |
| JWT Expiry            | ✓       |
| JWT Blacklist         | ✓       |
| Payload Endpoint      | ✓       |
| Logout                | ✓       |
| Middleware            | ✓       |
| Activity Logging      | ✓       |
| Security Scenarios    | ✓       |
