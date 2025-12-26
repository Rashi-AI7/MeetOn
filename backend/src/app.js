import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import { connectToSocket } from './controllers/socketManager.js';
import userRoutes from "./routes/users.routes.js";
import { User } from "./models/user.model.js";
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const app = express();
const server = createServer(app);
const io = connectToSocket(server);

// --- 1. CONFIG: Fix __dirname for ES Modules ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// --- 2. CONFIG: Multer Storage ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Pointing to 'uploads' folder relative to this file
        // If app.js is in 'src', and 'uploads' is in 'backend', we go up one level '../'
        cb(null, path.join(__dirname, '../uploads')); 
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

app.set("port", (process.env.PORT || 8000));
app.use(cors());
app.use(express.json({ limit: "40kb" }));
app.use(express.urlencoded({ limit: "40kb", extended: true }));

// --- 3. MIDDLEWARE: Serve Uploads Folder Publicly ---
// This is critical for the frontend to actually SEE the image
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use("/api/v1/users", userRoutes);

// --- 4. ROUTE: Upload Endpoint ---
app.post("/api/upload_avatar", upload.single('avatar'), async (req, res) => {
    try {
        const { username } = req.body;
        
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        // Construct the URL
        const imageUrl = `http://localhost:8000/uploads/${req.file.filename}`;

        // Update User in DB
        const updatedUser = await User.findOneAndUpdate(
            { username: username },
            { avatar: imageUrl }, 
            { new: true }
        );

        res.json({ message: "Upload successful", url: imageUrl });

    } catch (error) {
        console.error("Upload Error:", error);
        res.status(500).json({ message: "Server Error" });
    }
});

const start = async () => {
    try {
        const connectionDb = await mongoose.connect("mongodb+srv://rashisin07_db_user:meetOn123@cluster0.0pv2lkm.mongodb.net/")
        console.log(`Mongodb connected host: ${connectionDb.connection.host}`);
        server.listen(app.get("port"), () => {
            console.log("Listening on 8000");
        });
    } catch (error) {
        console.log("Error connecting to DB:", error);
    }
}

start();