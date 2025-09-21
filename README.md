Telegram Product Availability Bot 🤖
A powerful and extendable Telegram bot that monitors e-commerce product pages for availability and sends instant notifications when an item is back in stock.

This bot is designed to run 24/7, using a persistent database to ensure that no monitored products are lost on restart. It leverages a headless browser for accurate scraping and provides a seamless user experience through Telegram.

## Features
🛍️ Multi-Product Monitoring: Track multiple product URLs simultaneously.

📍 Pincode Specific: Checks availability for a specific delivery pincode provided by the user.

⏰ Scheduled Checks: Uses a cron job to check for stock at configurable intervals.

🔔 Instant Rich Notifications: Get alerts on Telegram with inline "Buy Now" and "Stop Monitoring" buttons.

💾 Persistent Storage: Uses MongoDB Atlas to store all monitored products, ensuring data safety and persistence.

🌐 Web Dashboard: Includes a simple Express.js web server to display project information and status.

🤖 Robust Scraping: Built with Puppeteer to handle modern, JavaScript-heavy websites.

Resilient by Design: Includes a notification queue and rate-limiting to handle API errors and prevent spam.

## Technology Stack
Category	Technology
Backend	Node.js, Express.js
Web Scraping	Puppeteer
Scheduling	node-cron
Database	MongoDB Atlas
Telegram API	node-telegram-bot-api
Configuration	dotenv
Logging	winston
Process Management	PM2 (Recommended for Production)

Export to Sheets
## Architecture Overview
The application is designed with a clear separation of concerns, making it modular and scalable.

[User] <--> [Telegram] <--> [Node.js Bot Server (Background Worker)]
                                |
                                +-----> [Scheduler (node-cron)] ---> [Web Scraper (Puppeteer)] ---> [Product Website]
                                |
                                +-----> [MongoDB Atlas (Database)]
## Prerequisites
Before you begin, ensure you have the following:

Node.js (LTS version recommended)

A Telegram account

A free MongoDB Atlas account

Git

## Installation & Local Setup
Follow these steps to get your bot running on your local machine.

Clone the Repository

Bash

git clone <your-repository-url>
cd <your-repository-name>
Install Dependencies

Bash

npm install
Create a Telegram Bot

Open Telegram and chat with the @BotFather.

Use the /newbot command to create a new bot.

BotFather will give you a token. Copy this token.

Set up MongoDB Atlas

Create a free (M0) cluster on MongoDB Atlas.

Create a database user and save the password.

In "Network Access," add your current IP address and 0.0.0.0/0 (Allow Access from Anywhere).

Get your connection string (Connect -> Drivers).

Configure Environment Variables

Create a .env file in the root of the project. You can copy the .env.example file if one exists.

Add your credentials to the .env file.

नमस्ते! आपके बॉट को सही तरीके से चलाने के लिए कुछ ज़रूरी वेरिएबल्स सेट करने होंगे। नीचे दी गई तालिका में इन सभी वेरिएबल्स की जानकारी है।

## Environment Variables
Variable	Description	Example
BOT_TOKEN	The token for your Telegram bot from BotFather.	123456789:ABCdefgHIJKLmnOPQRSTuvw-xyz
MONGODB_URI	The connection string for your MongoDB Atlas database.	mongodb+srv://user:pass@cluster.xyz.mongodb.net/
CHECK_INTERVAL	(Optional) The cron schedule for checks. Defaults to every 10 mins.	*/5 * * * * (for every 5 minutes)
PINCODE	(Optional) The default pincode if a user doesn't provide one.	396191

Export to Sheets
## Running the Application
For Development (with auto-restart):

Bash

npm run dev
For Production:

Bash

npm start
## Bot Commands
/start - Initializes the bot and displays a welcome message.

/help - Shows a detailed list of commands and examples.

/monitor <URL> [PINCODE] - Starts monitoring a product. The pincode is optional.

/stop <URL> [PINCODE] - Stops monitoring a product for a specific pincode.

/status - Shows a list of all products you are currently monitoring.

## Deployment
This application is designed to run 24/7. It is recommended to deploy it on a platform that supports long-running background processes.

Recommended Platform: Fly.io offers a generous "free allowance" that can host this bot at no cost.

Advanced Option: A self-managed VM, such as the Oracle Cloud Free Tier, provides the most powerful free resources but requires manual setup with a process manager like PM2.

When deploying, you should run the application as two separate processes for best performance:

Web Service: Runs index.js to serve the dashboard. (npm run start:web)

Background Worker: Runs worker.js to operate the bot and scheduler. (npm run start:worker)