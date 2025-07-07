const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const authRoutes = require("./routes/auth");
const propertyRoutes = require("./routes/property");
const bookingRoutes = require("./routes/booking");
const paymentRoutes = require("./routes/payment");
const chatRoutes = require("./routes/chat");
const otpRoutes = require("./routes/otp");
const { createServer } = require("http");
const { Server } = require("socket.io");

dotenv.config();
console.log("Loaded environment variables:", process.env);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"],
  },
});

// Attach io to app for use in routes
app.set("io", io);

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

app.use("/api/auth", authRoutes);
app.use("/api/property", propertyRoutes);
app.use("/api/booking", bookingRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/otp", otpRoutes);

require("./socket")(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));