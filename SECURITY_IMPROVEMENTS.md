# Session-Based Authentication

## Architecture

### Backend Changes

#### 1. Session Middleware (`server/src/app.js`)
- Added `express-session` with secure cookie configuration
- HTTP-only cookies prevent JavaScript access (XSS protection)
- Secure flag in production (requires HTTPS)
- CORS configured to allow credentials

#### 2. Auth Controller (`server/src/controllers/authController.js`)
- OAuth callback now creates session instead of URL redirect with token
- New endpoints:
  - `GET /api/auth/me` - Get current user from session
  - `GET /api/auth/token` - Get access token (checks session & expiry)
  - `POST /api/auth/logout` - Destroy session

#### 3. Auth Routes (`server/src/routes/auth.js`)
- Added session-based routes for user info, token access, and logout

### Frontend Changes

#### 1. App Component (`client/src/App.jsx`)
- Removed URL parameter parsing for tokens
- Fetches user info from `/api/auth/me` on page load
- Includes `credentials: 'include'` in all API calls (sends cookies)
- Logout calls API endpoint to destroy session

#### 2. Spotify Player (`client/src/SpotifyPlayer.jsx`)
- Fetches access token from `/api/auth/token` when needed
- No longer receives token as prop
- Handles token expiration with user-friendly error messages

## Environment Setup

Add to your `.env` file in `/server`:

```bash
# Required: Generate a strong random secret for session encryption
SESSION_SECRET=your-very-long-random-secret-here

# Optional: Set to production for HTTPS-only cookies
NODE_ENV=production

# Already configured:
CLIENT_URL=http://127.0.0.1:5173
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3001/api/auth/callback
```

To generate a strong session secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## How It Works Now

### Login Flow
1. User clicks "Login with Spotify"
2. Redirects to Spotify OAuth
3. User authorizes app
4. Spotify redirects back to `/api/auth/callback`
5. Backend:
   - Exchanges code for access token
   - Saves token to database
   - Creates session with user ID
   - Sends session cookie to browser
   - Redirects to client (no data in URL)
6. Frontend:
   - Calls `/api/auth/me` to get user info from session
   - Displays user as logged in

### Using Spotify Player
1. SpotifyPlayer component calls `/api/auth/token`
2. Backend verifies session
3. Backend fetches token from database
4. Backend checks if token expired
5. Returns token over secure connection
6. Frontend initializes Spotify SDK with token

### Logout Flow
1. User clicks logout
2. Frontend calls `POST /api/auth/logout`
3. Backend destroys session
4. Session cookie is invalidated
5. User logged out

## Benefits

### Security
- **No token exposure**: Tokens never appear in URLs, browser history, or localStorage
- **XSS protection**: HTTP-only cookies can't be accessed by JavaScript
- **CSRF protection**: Session-based auth with proper CORS configuration
- **Token expiration**: Backend validates token expiry before returning it

### User Experience
- **Clean URLs**: No sensitive data in address bar
- **Persistent sessions**: Users stay logged in across page refreshes
- **Graceful expiration**: Clear error messages when tokens expire

## Testing

1. Start the server:
   ```bash
   cd server
   npm start
   ```

2. Start the client:
   ```bash
   cd client
   npm run dev
   ```

3. Test the flow:
   - Click "Login with Spotify"
   - Authorize the app
   - Should redirect back with session (no URL params)
   - Spotify player should load automatically
   - Refresh page - you should stay logged in
   - Click logout - session should be destroyed

## Production Considerations

### Required for Production:
1. **Set `NODE_ENV=production`** - enables secure cookie flag (HTTPS only)
2. **Use HTTPS** - required for secure cookies
3. **Strong SESSION_SECRET** - use long random string
4. **Session Store** - Use Redis or database-backed sessions instead of memory store
   ```bash
   npm install connect-redis redis
   ```

### Optional Improvements:
- Add CSRF protection with `csurf` middleware
- Implement token refresh flow using `refresh_token`
- Add rate limiting to prevent brute force attacks
- Set up proper logging (avoid logging sensitive data)

## Notes

- Spotify access tokens expire after 1 hour
- When token expires, user needs to log out and log back in
- Future improvement: Auto-refresh tokens using `refresh_token` stored in database
- Spotify Premium account required for Web Playback SDK

