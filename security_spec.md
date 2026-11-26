# Security Specification & Hardened Rules TDD — ভোক্তা-জিতাও (voktajitao)

## 1. Data Invariants
1. **Product Integrity**: Only verified admins (`saifulislam14720@gmail.com`, `shamimsardarche153@gmail.com`, or verified UIDs in `/admins/{uid}`) may create, edit, or delete `/products/{productId}`. Regular price must be `>= price`, both `> 0`.
2. **PII Isolation (Users, Customers & Orders)**: Customer phone numbers, addresses, and user account emails in `/users/{userId}`, `/customers/{userId}`, and `/orders/{orderId}` are strictly protected. Non-admins can only read/write their own record matching `request.auth.uid` and `email_verified == true`.
3. **Admin Delegation & Anti-Escalation**:
   - Regular users cannot self-assign `role == 'admin'` in `/users/{uid}` or `/admins/{uid}`.
   - A verified user may only create `/admins/{request.auth.uid}` if they are already an admin OR they hold a valid matching `/adminInvites/{inviteId}` whose `email == request.auth.token.email.lower()`.
   - Only existing admins can create or delete `/adminInvites/{inviteId}` or delete `/admins/{userId}`.
4. **Order Integrity**: Any newly created order must start with `status == 'pending'`, match `deliveryCharge == 70` (for `inside_dhaka`) or `100` (for `outside_dhaka`), enforce `totalAmount == subtotal + deliveryCharge`, enforce `items.size() >= 1 && items.size() <= 50`, and bind `customerUid` to `request.auth.uid` (when authenticated) or `""` (when unauthenticated guest).
5. **No Shadow Fields / No Client Timestamps**: Every collection validates exact key sets via `hasAll` + `hasOnly` on create, `affectedKeys().hasOnly(...)` on update, and `request.time` for `createdAt`/`updatedAt`/`lastLoginAt`.

## 2. Dirty Dozen Adversarial Payloads
1. **Shadow Field Injection on Order**: Adding `"isPaid": true` or `"discountOverride": 999` to `/orders/{id}` -> Must fail `hasOnly`.
2. **Status Shortcutting on Order Create**: Creating an order with `"status": "delivered"` -> Must fail `status == 'pending'`.
3. **Delivery Fee Tampering**: Sending `deliveryZone: "outside_dhaka"` with `deliveryCharge: 0` -> Must fail charge invariant.
4. **Total Amount Tampering**: Sending `subtotal: 1000`, `deliveryCharge: 70`, `totalAmount: 100` -> Must fail `totalAmount == subtotal + deliveryCharge`.
5. **Customer UID Spoofing**: Guest or User A creating `/orders/{id}` with `customerUid: "user_B"` -> Must fail `customerUid` identity gate.
6. **PII Blanket Read on Users / Orders**: Signed-in non-admin customer calling `getDocs(collection(db, 'users'))` or `getDocs(collection(db, 'orders'))` without matching `uid` -> Must fail `allow list`.
7. **PII Cross-User Profile Read**: User A reading `/users/user_B` or `/customers/user_B` -> Must fail `allow get`.
8. **Email Spoofing Admin Bypass**: Token with `email: "saifulislam14720@gmail.com"` and `email_verified: false` attempting product or admin write -> Must fail `email_verified == true`.
9. **Resource Poisoning via Giant ID**: Creating `/users/<200-char-id>` -> Must fail `isValidId()`.
10. **Self-Assigned Admin Escalation without Invite**: Customer writing `/admins/{theirUid}` with fake `inviteId: "fake"` -> Must fail `exists()` + `get()` email match on `/adminInvites`.
11. **Invite Hijacking**: User A creating `/admins/{userA}` using User B's `inviteId` -> Must fail `get(...).data.email == request.auth.token.email.lower()`.
12. **User Login Timestamp Forgery / Immutable createdAt Tampering**: User updating `/users/{uid}` `createdAt` -> Must fail `incoming().createdAt == existing().createdAt`.
