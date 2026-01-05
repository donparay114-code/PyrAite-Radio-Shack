## 2026-01-05 - Unauthenticated User Creation/Modification Endpoint
**Vulnerability:** The `POST /users/` endpoint in `src/api/routes/users.py` was completely unauthenticated. It accepted a `UserCreate` payload containing a `telegram_id` and other user details. This allowed any unauthenticated attacker to create a new user with an arbitrary Telegram ID or, more critically, update the details (username, name) of an existing user if they guessed the Telegram ID correctly.

**Learning:** The endpoint appeared to be a remnant of an earlier development phase or an intended admin/testing utility that was not properly secured. The application has other secure authentication methods (`/auth/telegram`, `/auth/email/signup`), making this endpoint redundant for normal user flows but dangerous if left exposed. It highlights the importance of auditing all endpoints, especially generic "CRUD" style endpoints that might be auto-generated or copy-pasted.

**Prevention:**
1.  **Audit all `POST`, `PUT`, `DELETE` endpoints:** Ensure every state-changing endpoint has an authentication dependency (`Depends(get_current_user)` or similar).
2.  **Principle of Least Privilege:** If an endpoint is for admin use, explicitly enforce admin checks. If it's for user registration, ensure it doesn't allow overwriting existing data without proof of ownership (e.g., verifying a token signature).
3.  **Review "orphan" endpoints:** Check if an endpoint is actually used by the frontend or other services. If not, remove it or deprecate it.
