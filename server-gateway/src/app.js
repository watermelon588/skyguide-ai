require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const http = require("http");
const { Server } = require("socket.io");

const connectDB = require("./config/db");
const authRoutes = require("./routes/auth.routes");
const alignmentRoutes = require("./routes/alignment.routes");
const initializeSockets = require("./sockets");
const chatRoutes = require("./routes/chat.routes");

const app = express();

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

app.use(cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: CLIENT_URL,
        credentials: true,
    },
});

initializeSockets(io);

app.set("io", io);

app.use(helmet());
app.use(compression());
app.use(morgan("dev"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.JWT_SECRET)); // 4. Initialize cookie parser with secret signature string

// Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/alignment", alignmentRoutes);
app.use("/api/chat", chatRoutes);


app.get("/health", (req, res) => {
    res.status(200).json({
        success: true,
        status: "healthy",
        service: "server-gateway",
    });
});

app.use((err, req, res, next) => {
    console.error(err.stack);

    res.status(err.status || 500).json({
        success: false,
        message: err.message || "Internal Server Error",
    });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await connectDB();

        server.listen(PORT, () => {
            console.log(
                `🚀 Gateway listening on port ${PORT} in ${process.env.NODE_ENV} mode`
            );
        });
    } catch (err) {
        console.error("Server startup failed:", err);
        process.exit(1);
    }
};

startServer();