# MeetOn

![MeetOn Banner](public/vc.webp)

> **High-quality meetings without the hassle.** > Secure, fast, and free video conferencing for everyone.

[![React](https://img.shields.io/badge/Frontend-React-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![MUI](https://img.shields.io/badge/UI-Material--UI-007FFF?logo=mui&logoColor=white)](https://mui.com/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## About The Project

**MeetOn** is a modern video conferencing application designed to make connecting with others seamless and secure. Built with the MERN stack, it offers a clean, user-friendly interface for high-quality video calls.

Whether you are joining as a guest or registering for a secure dashboard, MeetOn prioritizes user experience and performance.

### Key Features
* **Modern UI/UX:** A responsive landing page with glassmorphism effects and smooth animations.
* **Secure Authentication:** User registration and login powered by secure backend API (JWT/Cookies).
* **Split-Screen Auth:** Professional, accessible authentication pages using Material UI.
* **Guest Access:** Quick join capabilities without mandatory sign-up (Coming Soon).
* **Real-time Video:** High-quality video streaming (In Progress).

## 🛠️ Tech Stack

**Frontend:**
* React.js
* Material UI (MUI) for component styling
* CSS3 with Flexbox/Grid & Custom Animations

**Backend:**
* Node.js
* Express.js
* MongoDB (Database)
* JWT (JSON Web Tokens) for Authentication

## Screenshots

| Landing Page | Login Page |
|:---:|:---:|
| <img src="public/vc.webp" width="400" alt="Landing Page"> | <img src="public/video-conference.webp" width="400" alt="Login Page"> |

*(Note: Replace these paths with actual screenshots of your running app)*

## Getting Started

Follow these instructions to set up the project locally on your machine.

### Prerequisites
* Node.js (v14 or higher)
* npm or yarn
* MongoDB (Local or Atlas URL)

### Installation

1.  **Clone the repository**
    ```bash
    git clone [https://github.com/yourusername/MeetOn.git](https://github.com/yourusername/MeetOn.git)
    cd MeetOn
    ```

2.  **Install Frontend Dependencies**
    ```bash
    cd frontend/meet-app
    npm install
    ```

3.  **Install Backend Dependencies**
    ```bash
    cd ../../backend
    npm install
    ```

4.  **Configure Environment Variables**
    Create a `.env` file in the `backend` folder and add:
    ```env
    PORT=5000
    MONGO_URI=your_mongodb_connection_string
    JWT_SECRET=your_jwt_secret_key
    ```

5.  **Run the App**
    * **Backend:** `npm start` (Runs on port 5000)
    * **Frontend:** `npm start` (Runs on port 3000)

## Project Structure

```text
MeetOn/
├── backend/            # Express & Node.js Server
│   ├── controllers/    # Route logic
│   ├── models/         # Mongoose Schemas
│   └── routes/         # API Endpoints
│
└── frontend/meet-app/  # React Application
    ├── public/         # Static assets
    └── src/
        ├── components/ # Reusable UI components (SignInCard, etc.)
        ├── pages/      # Main Pages (Landing, Authentication)
        └── utils/      # Helper functions
