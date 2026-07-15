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
const network = require("./config/network");
const authRoutes = require("./routes/auth.routes");
const alignmentRoutes = require("./routes/alignment.routes");
const initializeSockets = require("./sockets");
const chatRoutes = require("./routes/chat.routes");
const userRoutes = require("./routes/user.routes");
const telescopeRoutes = require("./routes/telescope.routes");
const observationRoutes = require("./routes/observation.routes");
const observerRoutes = require("./routes/observer.routes");
const communityRoutes = require("./routes/community.routes");
const notificationRoutes = require("./routes/notification.routes");
const digestJob = require("./jobs/digestJob");

const app = express();

// Allowed browser origins come from the network config layer (config/network.js),
// which resolves them from NETWORK_MODE + the per-mode *_CLIENT_URL vars. Switching
// between localhost, a LAN IP, or a Cloudflare Tunnel is a pure env change.
const ALLOWED_ORIGINS = network.getAllowedOrigins();

// Reflect the request origin when it is allow-listed. Credentials require a
// specific origin (never "*"), and requests without an Origin (curl, native
// mobile) are permitted.
const corsOrigin = (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
    }
    return callback(new Error(`Origin not allowed by CORS: ${origin}`));
};

app.use(cors({
    origin: corsOrigin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ALLOWED_ORIGINS,
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
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/telescope", telescopeRoutes);
app.use("/api/v1/observations", observationRoutes);
app.use("/api/v1/observers", observerRoutes);
app.use("/api/v1/community", communityRoutes);
app.use("/api/v1/notifications", notificationRoutes);


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

        // Bind on 0.0.0.0 (network.getHost) so phones on the LAN and Cloudflare
        // tunnels can reach the gateway — never bind to localhost only.
        server.listen(PORT, network.getHost(), () => {
            console.log(
                `🚀 Gateway listening on port ${PORT} in ${process.env.NODE_ENV} mode`
            );
            network.logNetworkConfig(PORT);
        });

        // Scheduled jobs (digest emails). DISABLE_CRON=true for throwaway or
        // secondary instances: they share the production database, so an
        // unguarded scheduler would mail real observers from a test process.
        if (process.env.DISABLE_CRON === "true") {
            console.log("⏸  Scheduled jobs disabled (DISABLE_CRON=true)");
        } else {
            digestJob.start();
        }
    } catch (err) {
        console.error("Server startup failed:", err);
        process.exit(1);
    }
};

startServer();