require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

const connectDB = require("./config/db");
const authRoutes = require("./routes/auth.routes");

const app = express();

app.use(helmet());

app.use(cors({
    origin: "http://localhost:5000", // change in production
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(compression());
app.use(morgan("dev"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.JWT_SECRET)); // 4. Initialize cookie parser with secret signature string

// Routes
app.use("/api/v1/auth", authRoutes);

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

        app.listen(PORT, () => {
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