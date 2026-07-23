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
const recommendationRoutes = require("./routes/recommendation.routes");
const feedbackRoutes = require("./routes/feedback.routes");
const astroRoutes = require("./routes/astro.routes");
const galleryRoutes = require("./routes/gallery.routes");
const galleryService = require("./services/galleryService");
const digestJob = require("./jobs/digestJob");
const alertsJob = require("./jobs/alertsJob");

const app = express();

// Trust the reverse proxy ONLY when one is actually in front of us (Cloudflare
// Tunnel / production). Express then reads the real client IP and protocol from
// X-Forwarded-*, which is what express-rate-limit keys on. See
// network.getTrustProxy() for why this is a hop count and never `true`, and why
// enabling it unconditionally would make rate limiting forgeable.
app.set("trust proxy", network.getTrustProxy());

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
// "dev" is colourized and logs full paths — fine locally, noisy and
// needlessly detailed in production. "combined" is the standard access log.
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

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
app.use("/api/v1/recommendations", recommendationRoutes);
app.use("/api/v1/feedback", feedbackRoutes);
// Public science data, proxied so the engine itself stays private.
app.use("/api/v1/astro", astroRoutes);
app.use("/api/v1/gallery", galleryRoutes);

/**
 * Serve shared gallery photos as static files.
 *
 * `crossOriginResourcePolicy: "cross-origin"` is required: helmet defaults it to
 * "same-origin", and the frontend is a DIFFERENT origin from the gateway in
 * every mode this app runs in (localhost:5173 -> :5000, and separate hosts in
 * production), so without it the browser blocks every image.
 *
 * The directory holds only server-named files (see gallery.routes.js), and
 * `index: false` keeps it from ever listing its contents.
 */
app.use(
    galleryService.PUBLIC_PREFIX,
    express.static(galleryService.UPLOAD_DIR, {
        index: false,
        maxAge: "7d",
        setHeaders: (res) => {
            // Set HERE rather than by reconfiguring helmet globally, so the
            // relaxation applies to images only and the API keeps its default.
            res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
            // Uploaded content is never executed: don't let a crafted file be
            // sniffed into markup, and neutralize it if it somehow is.
            res.setHeader("X-Content-Type-Options", "nosniff");
            res.setHeader("Content-Security-Policy", "default-src 'none'");
        },
    }),
);


app.get("/health", (req, res) => {
    res.status(200).json({
        success: true,
        status: "healthy",
        service: "server-gateway",
    });
});

/**
 * Global error handler.
 *
 * The full error always goes to the SERVER log. What reaches the client
 * depends on whether the message was written for them:
 *
 *   4xx -> deliberate, human-readable messages thrown by services
 *          (httpError(400, "Bio must be 280 characters or fewer.")). Safe and
 *          necessary to forward, or every validation failure reads "error".
 *   5xx -> unexpected. In production the message is replaced, because raw
 *          exception text leaks schema names, file paths, driver internals and
 *          connection strings straight to the caller.
 */
app.use((err, req, res, next) => {
    const status = err.status || 500;

    console.error(`[${req.method} ${req.originalUrl}]`, err.stack || err);

    const isClientError = status >= 400 && status < 500;
    const exposeMessage =
        isClientError || process.env.NODE_ENV !== "production";

    res.status(status).json({
        success: false,
        message:
            (exposeMessage && err.message) || "Internal Server Error",
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

        // Scheduled jobs (digest + event alerts, both of which email).
        // DISABLE_CRON=true for throwaway or secondary instances: they share the
        // production database, so an unguarded scheduler would mail real
        // observers from a test process.
        if (process.env.DISABLE_CRON === "true") {
            console.log("⏸  Scheduled jobs disabled (DISABLE_CRON=true)");
        } else {
            digestJob.start();
            alertsJob.start();
        }
    } catch (err) {
        console.error("Server startup failed:", err);
        process.exit(1);
    }
};

startServer();