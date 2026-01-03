
import { io } from "socket.io-client";
import fetch from "node-fetch";

const SOCKET_URL = "http://localhost:3001";
const API_URL = "http://localhost:3000/api/channels/test-channel-id/moderation";

async function runTest() {
    console.log("Connecting to Socket.io server...");
    const socket = io(SOCKET_URL);

    socket.on("connect", () => {
        console.log("Connected to Socket.io server");
        socket.emit("join-channel", "test-channel-id");
    });

    socket.on("moderation-settings-changed", (data) => {
        console.log("SUCCESS: Received moderation-settings-changed event:", data);
        socket.disconnect();
        process.exit(0);
    });

    // Wait for connection and join
    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log("Triggering API update...");
    // Note: This requires a valid session/auth to actually work against the real API.
    // For this test script to work in isolation, we might need a mock or valid cookie.
    // Alternatively, we verify the socket server part separately from the Next.js integration.

    console.log("Test script running. Please trigger the API manually or ensure valid auth cookies are present.");
}

runTest().catch(console.error);
