/**
 * ==============================================================================
 * Main Application Entry Point - Product Availability Tracker
 * ==============================================================================
 *
 * @description This file initializes and orchestrates all services for the
 * product availability tracking application. It sets up an Express
 * web server to serve the static frontend, starts the Telegram
 * bot for user interactions, and activates the scheduler for
 * periodic product checks.
 * @author      Abhishek Yadav
 * @version     1.0.0
 */

// Load environment variables from the .env file at the earliest point.
require('dotenv').config();

// --- Core Dependencies ---
const express = require('express');
const path = require('path');

// --- Application Services ---
// The telegrambotHandler initializes the bot and sets up command listeners.
// We import it here to ensure the bot starts polling for messages.
require('./services/telegramBotHandler');

// The schedulingHandler provides the function to start the background cron job.
const { startScheduler } = require('./services/schedulingHandler');


// --- Express Application Setup ---
const app = express();
const PORT = process.env.PORT || 3000;

console.log('🚀 Initializing Product Availability Tracker...');

// --- Middleware Configuration ---
// Serve static files (index.html, style.css, app.js) from the 'static' directory.
// This allows the browser to access these files directly.
app.use(express.static(path.join(__dirname, 'static')));


// --- Routing Configuration ---
// Define the handler for the root path ('/').
// When a user visits the base URL, it will serve the main index.html file.
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'static', 'index.html'));
});


// --- Application Initialization ---
// Start the scheduled task runner. This will begin the periodic checks
// for product availability as defined in the schedulingHandler.
startScheduler();


// --- Server Activation ---
// Start the Express server and listen for incoming HTTP requests on the specified port.
app.listen(PORT, () => {
    console.log(`🌐 Web server is running and accessible at http://localhost:${PORT}`);
    console.log('✅ Application started successfully. The bot is active and monitoring.');
});

// --- Graceful Shutdown Handling ---
// Ensures that the bot stops polling cleanly when the application process is terminated.
const cleanup = (signal) => {
    console.log(`\nReceived ${signal}. Shutting down gracefully...`);
    // Add any other cleanup tasks here (e.g., closing database connections)
    process.exit(0);
};

process.on('SIGINT', () => cleanup('SIGINT'));
process.on('SIGTERM', () => cleanup('SIGTERM'));