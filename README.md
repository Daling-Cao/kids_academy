# KidsAcademy 🎓

KidsAcademy is a modern, gamified learning platform designed for kids. It combines interactive lessons, quizzes, and a reward system to make learning engaging and fun.

![Banner](https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&q=80&w=1200&h=400)

## ✨ Features

- **🎯 Interactive Projects**: Gamified learning modules organized by "Buildings".
- **✅ Multi-select Quizzes**: Advanced quiz system supporting multiple correct answers.
- **💬 Teacher-Student Messaging**: In-app communication with reply capabilities.
- **🪙 Reward & Rank System**: Earn "BlockCoins" by completing projects and level up your rank.
- **👨‍🏫 Teacher Dashboard**: Manage students, projects, buildings, and messages.
- **📱 Responsive Design**: Fully responsive UI built with Tailwind CSS and Framer Motion.

## 🚀 Tech Stack

- **Frontend**: [React 19](https://react.dev/), [Vite 6](https://vitejs.dev/), [Tailwind CSS 4](https://tailwindcss.com/)
- **Backend**: [Node.js](https://nodejs.org/), [Express](https://expressjs.com/)
- **Database**: [SQLite](https://sqlite.org/) via [`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3)
- **Authentication**: JWT (JSON Web Tokens) & Bcrypt
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Icons**: [Lucide React](https://lucide.dev/)

## 🛠️ Local Development

### Prerequisites
- Node.js (v20 or higher)
- npm or pnpm

### Setup
1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/KidsAcademy.git
   cd KidsAcademy/kids_academy
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Create a `.env` file in the root directory:
   ```env
   NODE_ENV=development
   PORT=3000
   JWT_SECRET=your_secret_key_here
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🚢 Deployment

For production deployment on a VPS (e.g., IONOS) using Nginx and PM2, please refer to the detailed [DEPLOY.md](./DEPLOY.md) guide.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
