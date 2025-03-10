# FreshFarmily Backend API

Node.js backend for the FreshFarmily application using Express.js and PostgreSQL.

## Features

- **Authentication**: JWT-based authentication with role-based permissions
- **User Management**: User registration, login, profile management
- **Security**: Password hashing, token validation, rate limiting
- **Database**: PostgreSQL with Sequelize ORM
- **Logging**: Winston-based logging for better debugging and monitoring

## Prerequisites

- Node.js (>= 14.x)
- PostgreSQL (>= 12.x)
- npm or yarn

## Environment Setup

Create a `.env` file in the root directory with the following variables:

```
# Server Configuration
PORT=8000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=freshfarmily
DB_USER=postgres
DB_PASSWORD=yourpassword

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRATION=24h
REFRESH_TOKEN_EXPIRATION=7d

# Optional: Email Configuration (for verification emails)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=yoursmtppassword
EMAIL_FROM=noreply@freshfarmily.com
```

## Installation

1. Clone the repository
2. Navigate to the `node-backend` directory
3. Install the dependencies:

```bash
npm install
```

4. Create a PostgreSQL database named `freshfarmily` (or as specified in your `.env` file)
5. Start the server:

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/verify` - Verify email with token
- `POST /api/auth/login` - Login and get JWT tokens
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/change-password` - Change user password
- `GET /api/auth/me` - Get current user information
- `POST /api/auth/logout` - Logout (clear refresh token)

### User Management

- `GET /api/users/profile` - Get current user's profile
- `PUT /api/users/profile` - Update current user's profile
- `GET /api/users` - Get all users (admin only)
- `GET /api/users/:id` - Get user by ID (admin only)
- `PUT /api/users/:id/status` - Update user status (admin only)
- `DELETE /api/users/:id` - Delete a user (admin only)

## Role-Based Permissions

The application uses a role-based permission system:

- **Admin**: Full access (read, write, update, delete, admin)
- **Farmer**: Limited access (read, write, update, delete_own)
- **Driver**: Delivery-focused access (read, update_delivery)
- **Consumer**: Basic access (read, create_order)

## Testing

Run tests with:

```bash
npm test
```

## Deployment

For production deployment:

1. Set `NODE_ENV=production` in your environment
2. Use a process manager like PM2 to manage the Node.js application
3. Configure a reverse proxy (Nginx/Apache) to handle SSL termination

## License

ISC
