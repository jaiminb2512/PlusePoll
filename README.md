# PulsePoll 🗳️

A real-time polling application built with Node.js, Express, Prisma, PostgreSQL, and Socket.IO. Create polls, vote in real-time, and see live updates as votes come in.

## 🚀 Features

- **User Authentication**: Secure JWT-based authentication with refresh tokens
- **Poll Management**: Create, update, delete, and publish polls
- **Real-time Voting**: Live vote updates using Socket.IO
- **Vote Management**: Vote, update votes, and remove votes
- **Poll Options**: Multiple choice options for each poll
- **User Profiles**: Manage user accounts and view voting history
- **Database ORM**: Type-safe database operations with Prisma
- **RESTful API**: Well-structured API endpoints
- **Health Monitoring**: API health checks and database connectivity status

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT (JSON Web Tokens)
- **Real-time**: Socket.IO
- **Password Hashing**: bcryptjs
- **Environment**: dotenv for configuration

## 📋 Prerequisites

- Node.js (v14 or higher)
- PostgreSQL database
- npm or yarn package manager

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/jaiminb2512/PlusePoll.git
   cd PulsePoll
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   
   Update the `.env` file with your configuration:
   ```env
   DATABASE_URL="postgresql://your_username:your_password@localhost:5432/your_database_name"
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRES_IN=7d
   JWT_REFRESH_EXPIRES_IN=30d
   NODE_ENV=development
   CLIENT_URL=http://localhost:3000
   PORT=3000
   ```

4. **Set up the database**
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Push schema to database (for development)
   npm run db:push
   
   # Or create and run migrations (for production)
   npm run db:migrate
   ```

5. **Start the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## 📚 API Endpoints

### Authentication
- `POST /api/users/register` - Register a new user
- `POST /api/users/login` - Login user
- `POST /api/users/refresh` - Refresh access token
- `POST /api/users/logout` - Logout user
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `DELETE /api/users/profile` - Delete user account

### Polls
- `GET /api/polls` - Get all polls (with pagination)
- `GET /api/polls/:id` - Get poll by ID
- `POST /api/polls` - Create a new poll (authenticated)
- `PUT /api/polls/:id` - Update poll (authenticated, owner only)
- `DELETE /api/polls/:id` - Delete poll (authenticated, owner only)
- `GET /api/polls/user/:userId` - Get polls by user
- `GET /api/polls/published` - Get published polls only

### Votes
- `POST /api/votes` - Add a vote (authenticated)
- `PUT /api/votes` - Update existing vote (authenticated)
- `DELETE /api/votes/:pollOptionId` - Remove vote (authenticated)
- `GET /api/votes/user` - Get user's votes (authenticated)
- `GET /api/votes/poll/:pollId` - Get votes for a specific poll
- `GET /api/votes/user/:pollId` - Get user's vote for a specific poll

### Health & Utility
- `GET /api/` - API status
- `GET /api/health` - Health check with database status

## 🗃️ Database Schema

### User Model
- `id` (String, Primary Key)
- `name` (String)
- `email` (String, Unique)
- `passwordHash` (String)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

### Poll Model
- `id` (String, Primary Key)
- `question` (String)
- `isPublished` (Boolean)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)
- `authorId` (String, Foreign Key)

### PollOption Model
- `id` (String, Primary Key)
- `text` (String)
- `pollId` (String, Foreign Key)

### Vote Model
- `id` (String, Primary Key)
- `userId` (String, Foreign Key)
- `pollId` (String, Foreign Key)
- `pollOptionId` (String, Foreign Key)
- `createdAt` (DateTime)

## 🔌 WebSocket Events

### Client to Server
- `join-poll` - Join a poll room for real-time updates
- `leave-poll` - Leave a poll room

### Server to Client
- `vote-update` - Real-time vote count updates
- `poll-updated` - Poll information updates

## 📁 Project Structure

```
PulsePoll/
├── controllers/          # Route controllers
│   ├── pollController.js
│   ├── userController.js
│   └── voteController.js
├── db/                  # Database configuration
│   └── index.js
├── middleware/          # Custom middleware
│   └── auth.js
├── models/              # Prisma schema files
│   ├── User.prisma
│   ├── Poll.prisma
│   ├── PollOption.prisma
│   └── Vote.prisma
├── prisma/              # Prisma migrations
│   └── migrations/
├── public/              # Static files
│   └── socket-client-example.html
├── routes/              # API routes
│   ├── index.js
│   ├── userRoutes.js
│   ├── pollRoutes.js
│   └── voteRoutes.js
├── services/            # Business logic services
│   ├── jwtService.js
│   └── socketService.js
├── utils/               # Utility functions
│   └── response.js
├── index.js             # Application entry point
├── package.json
└── README.md
```

## 🚦 Available Scripts

- `npm start` - Start the production server
- `npm run dev` - Start development server with nodemon
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema changes to database (development)
- `npm run db:migrate` - Create and run migrations (production)
- `npm run db:studio` - Open Prisma Studio for database management

## 🔒 Authentication

The API uses JWT-based authentication with the following features:

- **Access Tokens**: Short-lived tokens (7 days default)
- **Refresh Tokens**: Long-lived tokens (30 days default)
- **Secure Cookies**: Tokens stored in HTTP-only cookies
- **Protected Routes**: Middleware protection for authenticated endpoints

## 🌐 WebSocket Integration

Real-time features include:

- **Live Vote Updates**: See vote counts update in real-time
- **Poll Room Management**: Join/leave poll-specific rooms
- **Broadcast Updates**: Automatic notifications when votes change

## 🧪 Testing the API

You can test the API using:

1. **Postman/Insomnia**: Import the API endpoints
2. **curl**: Command-line testing
3. **Frontend Application**: Use the provided socket client example

Example socket client is available at: `http://localhost:3000/socket-client-example.html`

---
