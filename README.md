# 🌟 Kids Learning Platform

A modern, responsive, and interactive **multi-language educational platform** designed for children (ages 3–10) to learn alphabets, words, spelling, pronunciation, and vocabulary through engaging game-based activities.

The platform supports multiple languages, dynamic content import, speech pronunciation, and gamified learning while providing a clean and intuitive interface for children.

---

## ✨ Features

### 🌍 Multi-Language Support

- English
- Tamil
- Hindi
- Telugu
- Kannada
- Malayalam

The application interface remains in English while learning content changes according to the selected language.

---

## 📚 Learning Activities

- 🔤 Alphabet Learning
- 📖 Word Learning
- 🧩 Letter Arrangement
- ✍ Missing Letter
- 🖼 Picture Identification
- 🎧 Listening Activity
- 🃏 Flash Cards
- 🔗 Matching Game
- 🧠 Memory Game
- 📝 Quiz Mode

---

## 📄 Dynamic Word Import

Teachers and administrators can upload Microsoft Word (.docx) files containing vocabulary.

Example:

```text
Apple
Ball
Cat
Dog
Elephant
```

or

```text
பழம்
மரம்
பூ
வீடு
```

The application automatically:

- Reads the document
- Extracts words
- Removes duplicates
- Removes blank lines
- Displays imported words
- Makes them immediately available in all learning activities

---

## 🔊 Speech Support

Supports multiple pronunciation methods:

- Browser Speech Synthesis
- ElevenLabs Text-to-Speech
- Pre-recorded audio files

Speech architecture is modular and easily replaceable.

---

## 🎮 Gamification

- ⭐ Stars
- 🪙 Coins
- 🏆 Achievements
- 📈 Progress Tracking
- 🔥 Daily Streak
- 🎖 Certificates
- 🎉 Confetti Animations

---

## 📱 Responsive Design

Optimized for:

- Android
- iPhone
- Tablet
- Laptop
- Desktop

Touch-friendly and keyboard accessible.

---

## 🛠 Admin Panel

Features include:

- Manage Languages
- Manage Subjects
- Upload Word Documents
- Upload Images
- Upload Audio
- Edit Learning Items
- Delete Learning Items
- Import / Export Data
- Search & Filter Content

---

# 🏗 Technology Stack

## Frontend

- React
- TypeScript
- Vite
- Tailwind CSS

## Libraries

- React Router
- Zustand
- React Hook Form
- dnd-kit
- Framer Motion

## Storage

- IndexedDB
- Local Storage

## Document Parsing

- mammoth.js (DOCX)
- PDF Parser

## Speech

- ElevenLabs API
- Browser SpeechSynthesis API

---

# 📂 Project Structure

```
src/

├── assets/
├── components/
├── contexts/
├── hooks/
├── layouts/
├── pages/
│   ├── activities/
│   └── admin/
├── services/
├── types/
├── utils/

public/

├── languages/
├── audio/
├── images/
```

---

# 🚀 Installation

Clone the repository

```bash
git clone https://github.com/USERNAME/REPOSITORY.git
```

Move into the project

```bash
cd REPOSITORY
```

Install dependencies

```bash
npm install
```

Start development server

```bash
npm run dev
```

Open

```
http://localhost:5173
```

---

# 📦 Production Build

```bash
npm run build
```

Preview production build

```bash
npm run preview
```

---

# 🌐 Deployment

The application is compatible with:

- Vercel
- Netlify
- Firebase Hosting
- GitHub Pages (with configuration)

---

# 🔐 Environment Variables

Create a `.env` file.

Example

```env
VITE_ELEVENLABS_API_KEY=YOUR_API_KEY
```

Never commit API keys to GitHub.

---

# 📄 Supported File Formats

Word Import

- DOCX

Future Support

- PDF

---

# 🎯 Learning Workflow

```
Choose Language

↓

Choose Subject

↓

Select Activity

↓

Play Learning Game

↓

Earn Rewards

↓

Track Progress

↓

Receive Certificate
```

---

# 📊 Features Overview

| Feature | Status |
|----------|--------|
| Multi-Language | ✅ |
| Responsive UI | ✅ |
| Mobile Support | ✅ |
| Letter Arrangement | ✅ |
| Word Learning | ✅ |
| Flash Cards | ✅ |
| Listening Activity | ✅ |
| Matching Game | ✅ |
| Memory Game | ✅ |
| Quiz | ✅ |
| DOCX Import | ✅ |
| Admin Panel | ✅ |
| Speech Support | ✅ |
| IndexedDB | ✅ |
| Local Storage | ✅ |
| PWA Ready | ✅ |

---

# 🎨 UI Highlights

- Child-Friendly Interface
- Bright Color Palette
- Smooth Animations
- Responsive Cards
- Touch Optimized
- Accessible Navigation

---

# 📈 Future Enhancements

- User Authentication
- Teacher Dashboard
- Student Profiles
- Cloud Database
- Multiplayer Challenges
- AI-Based Personalized Learning
- Analytics Dashboard
- Classroom Management
- Leaderboards
- Offline Content Sync

---

# 🤝 Contributing

Contributions are welcome.

1. Fork the repository.
2. Create a new branch.
3. Commit your changes.
4. Push the branch.
5. Open a Pull Request.

---

# 📜 License

This project is licensed under the MIT License.

---

# 👨‍💻 Author

**Santhosh K. R.**

GitHub: https://github.com/Santhoshcoder001

---

## ⭐ Support

If you find this project useful, consider giving it a ⭐ on GitHub.
