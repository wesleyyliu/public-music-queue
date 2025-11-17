# Database Setup Instructions

## 1. Create PostgreSQL Database

```bash
# Connect to PostgreSQL
psql postgres

# Create database
CREATE DATABASE musicqueue;

# Exit
\q
```

## 2. Set Environment Variable

Edit your `server/.env` file:

```bash
DATABASE_URL=postgresql://your_username@localhost:5432/musicqueue
```

Replace `your_username` with your PostgreSQL username (usually your system username).

If you have a password:
```bash
DATABASE_URL=postgresql://username:password@localhost:5432/musicqueue
```

## 3. Run Database Migrations

For a fresh database:
```bash
cd server
psql -d musicqueue -f db/schema.sql
```

Or if you need to specify a username:
```bash
psql -U your_username -d musicqueue -f db/schema.sql
```

**For existing databases:** If you already have the database set up and need to add room support:
```bash
psql -d musicqueue -f db/migration_add_room.sql
```

## 4. Verify Tables Were Created

```bash
psql -d musicqueue

# List tables
\dt

# You should see: users, songs, queue_items

# Exit
\q
```

## 5. Test the Connection

Start your server:
```bash
node server.js
```

If you see "Server running..." without database errors, you're good to go!

## Troubleshooting

### "database does not exist"
```bash
createdb musicqueue
```

### "role does not exist"
Create a PostgreSQL user:
```bash
createuser your_username
```

### Connection refused
Make sure PostgreSQL is running:
```bash
# macOS
brew services start postgresql

# Linux
sudo systemctl start postgresql
```

