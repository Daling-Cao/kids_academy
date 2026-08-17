# KidsAcademy 🎓

KidsAcademy is a modern, gamified learning platform designed for kids. It combines interactive lessons, quizzes, and a reward system to make learning engaging and fun.

![Banner](https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&q=80&w=1200&h=400)

## ✨ Features

- **🎯 Interactive Projects**: Gamified learning modules organized by "Buildings".
- **✅ Multi-select Quizzes**: Advanced quiz system supporting multiple correct answers.
- **🖼️ Image-based Quizzes**: Teachers can add optional images to question prompts and individual answer choices. Answers can use text, an image, or both, and are supported in teacher previews and the student classroom.
- **📝 Homework Projects**: A project can be marked as *homework*. The article stays locked until the student uploads their own Scratch (`.sb3`) or code file. Handing something in — whatever the automatic test result — opens the article and earns an extra BlockCoin; the test itself is feedback, not a gate. See [Homework projects](#-homework-projects).
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

## 📝 Homework projects

A project has a type: **normal lesson** or **homework** (set in the project editor).

For a homework project the student first has to hand in their own work:

1. The classroom shows the task and an upload box; the article and quizzes are withheld **by the server** until a file has been handed in.
2. The uploaded file is analysed statically — it is never executed. `.sb3` archives are unzipped and their `project.json` is inspected (sprites, blocks, scripts, variables, lists, costumes, sounds, extensions); other files are searched as source text.
3. The teacher defines the checks per project (e.g. *at least 2 sprites*, *uses "Wiederhole ( ) mal"*, *at least 15 lines of code*). The results are shown to the student and the teacher as feedback — they do **not** gate the reward, only diligence (handing something in) does.

**Rewards**

| Situation | BlockCoins |
| --- | --- |
| Handed in (any test result), lesson finished | homework coin **+** the normal lesson reward |
| Nothing handed in | article stays closed, no reward |

The homework coin is granted once per project on the first hand-in, no matter the test result and no matter how often the student later resubmits. Students may resubmit as often as they like — e.g. to chase a passing result for its own sake, or because the teacher asked for it — and every attempt is kept and visible to the teacher under *Schüler → Abgegebene Hausaufgaben*, together with the per-check result and a download link.

Hand-ins are stored in `homework-uploads/` (outside the public `uploads/` tree) and are only reachable through the authenticated route `GET /api/homework/submissions/:id/file` — teachers, or the student who handed the file in.

**Storage and limits**

- Uploads are capped at 25 MB, and `project.json` is refused before it is inflated if the archive declares more than 32 MB or an implausible compression ratio, so a zip bomb cannot exhaust the server.
- Two files are kept per student and project: the newest hand-in and the newest *passing* one. Superseded attempts keep their result in the database (the teacher still sees the per-check outcome) but their file is deleted; the teacher UI shows "Durch neuere Abgabe ersetzt" instead of a download link.
- A student cannot hand in the same project twice within five seconds.
- Deleting a project or a student also deletes their homework files from disk.

## 🚢 Deployment

For production deployment on a VPS (e.g., IONOS) using Nginx and PM2, please refer to the detailed [DEPLOY.md](./DEPLOY.md) guide.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
