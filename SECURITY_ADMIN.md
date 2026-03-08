# Portfolio Security & Administration Reference

This document provides a technical overview of how your portfolio’s admin portal is secured and how to manage your credentials.

---

## 🔒 1. Admin Password (BCRYPT)

### The Principle
Your password is not stored in plain text. Instead, we store a **cryptographic hash** in your `.env` file under `ADMIN_PASSWORD_HASH`. 

- **Hashing:** When you set a password, it is processed through a one-way mathematical function.
- **Verification:** When you log in, the server hashes your input and compares it to the stored hash. If they match, access is granted.
- **Security:** Even if someone steals your `.env` file, they cannot "decrypt" the hash to see your actual password.

### Managing your Password
1. Run the **`hash-password.js`** tool to start the interactive prompt:
   ```bash
   node hash-password.js
   ```
   > [!TIP]
   > By running the script without arguments, you can type your password safely. This avoids all issues with special characters (like `@`, `!`, or even `'`) that shells usually struggle with.
2. Copy the resulting hash into your `.env` file:
   ```env
   ADMIN_PASSWORD_HASH=$2b$12$...your_hash...
   ```

---

## 🔑 2. Multi-Factor Authentication (TOTP)

### The Principle
TOTP (Time-based One-Time Password) is a shared secret mechanism between your server and your phone (e.g., Google Authenticator).

- **Shared Secret:** The `TOTP_SECRET` in your `.env` file is a private key shared only by the server and your app.
- **Dynamic Codes:** Both sides use the current time (in 30-second windows) + the secret to calculate a 6-digit code.
- **Verification:** If the code you type matches the one the server calculated for the exact same 30-second window, you are verified.

### Managing MFA
- **Resetting:** Go to the **Security** tab in the Admin Panel and click **"Reset & Reconfigure MFA"**. This will wipe the secret and prompt you to scan a new QR code.
- **Manual Reset:** If locked out, delete the `TOTP_SECRET` line from `.env` and restart the server.

---

## 🔄 3. Data Synchronization

The website uses a hybrid storage model to ensure both ease of use (via files) and scalability (via database).

- **profile.json to Database:** If you manually edit `data/profile.json`, the server detects the file as "newer" than the database record and automatically syncs the changes to MongoDB.
- **Database to profile.json:** When you make updates through the Admin Panel, the server saves the changes to MongoDB and immediately writes them back to `data/profile.json`.

---

## 🛠️ Troubleshooting
- **Codes not working?** Ensure your phone's clock is set to "Automatic." Even a 1-minute difference can cause codes to fail.
- **Forgot Password?** Use the `hash-password.js` utility mentioned above.
