const TelegramBot = require('node-telegram-bot-api');
const { checkProductAvailability } = require('./webScrapingHandler');
const cron = require('node-cron');
require('dotenv').config();
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const {NotificationManager} = require('./notificationHandler');
const { connectDB } = require('./database');

//fetch all the products
const productsCollectionPromise = connectDB();

//create an object of notification manager
const notificationManager = new NotificationManager(bot);

// Start command
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    userSubscriptions.add(chatId);

    bot.sendMessage(chatId, `
🤖 *Stock Monitor Bot Started!*

Available commands:
/monitor \\ - Start monitoring a product
/stop \\ - Stop monitoring a product  
/status - Show current monitoring status
/help - Show this help message

Example:
\`/monitor https://shop.amul.com/en/product/amul-high-protein-rose-lassi-200-ml-or-pack-of-30\`
    `, { parse_mode: 'Markdown' });
});

// Monitor command
bot.onText(/\/monitor\s+(https?:\/\/\S+)(?:\s+(\d{6}))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const url = match[1]; // The captured URL

    // Use the user's pincode if provided, otherwise fallback to the default from .env
    const pincode = match[2] || process.env.PINCODE || '396191';

    if (!isValidUrl(url)) {
        bot.sendMessage(chatId, '❌ Invalid URL format');
        return;
    }

    // Create a unique key for each URL-pincode combination
    const productKey = `${url}|${pincode}`;

    const products = await productsCollectionPromise;

    const existingProduct = await products.findOne({ _id: productKey, chatIds: chatId });

    // Check if this exact product is already being monitored
    if (existingProduct) {
        // You could add the user to the existing list if you want multiple users per item
        bot.sendMessage(chatId, `ℹ️ This product is already being monitored for pincode ${pincode}.`);
        return;
    }

    await products.updateOne(
        { _id: productKey },
        {
            $setOnInsert: { url, pincode, lastStatus: null, addedAt: new Date() },
            $addToSet: { chatIds: chatId }
        },
        { upsert: true } // Creates the document if it doesn't exist
    );

    bot.sendMessage(chatId, `✅ Started monitoring:\n${url}\nfor pincode: *${pincode}*`, { parse_mode: 'Markdown' });

    // Initial check
    try {
        const isAvailable = await checkProductAvailability(url, pincode); // Pass pincode to initial check
        const status = isAvailable ? '✅ In Stock' : '❌ Out of Stock';
        bot.sendMessage(chatId, `Current status: ${status}`);
    } catch (error) {
        bot.sendMessage(chatId, '⚠️ Error during the initial check. The bot will keep trying.');
    }
});

bot.onText(/\/stop\s+(https?:\/\/\S+)(?:\s+(\d{6}))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const url = match[1]; // The captured URL

    // Use the user's pincode if provided, otherwise fallback to the default.
    // This must match the logic in the /monitor command.
    const pincode = match[2] || process.env.PINCODE || '396191';

    // Recreate the unique product key to find the item in our Map
    const productKey = `${url}|${pincode}`;

    const result = await products.updateOne(
        { _id: productKey },
        { $pull: { chatIds: chatId } } // Removes the user's chatId from the list
    );

    if (result.modifiedCount > 0) {
        bot.sendMessage(chatId, `🛑 Stopped monitoring:\n${url}\nfor pincode: *${pincode}*`, { parse_mode: 'Markdown' });
    } else {
        bot.sendMessage(chatId, `❌ You were not monitoring this product for pincode *${pincode}*.`, { parse_mode: 'Markdown' });
    }

    // Optional: Clean up documents that no users are monitoring
    await products.deleteMany({ chatIds: { $size: 0 } });
});

// Status command
bot.onText(/\/status/, async (msg) => {
    const chatId = msg.chat.id;
    const products = await productsCollectionPromise;

    // Find all products this specific user is monitoring
    const userProducts = await products.find({ chatIds: chatId }).toArray();

    if (userProducts.length === 0) {
        bot.sendMessage(chatId, '📋 You are not currently monitoring any products.');
        return;
    }

    let statusMessage = '📋 *Your Monitored Products:*\n\n';
    userProducts.forEach(product => {
        const status = product.lastStatus === null ? '⏳ Checking...' : (product.lastStatus ? '✅ In Stock' : '❌ Out of Stock');
        statusMessage += `*URL*: ${product.url}\n*Pincode*: ${product.pincode}\n*Status*: ${status}\n\n`;
    });

    bot.sendMessage(chatId, statusMessage, { parse_mode: 'Markdown' });

});

// Help command
bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, `
🤖 *Telegram Stock Monitor Bot*

This bot tracks product availability and notifies you when an item is back in stock for a specific delivery pincode.

*Commands:*
/start - Initialize the bot
/monitor <URL> [PINCODE] - Add a product to the monitoring list. Pincode is optional.
/stop <URL> [PINCODE] - Remove a product from the monitoring list.
/status - Show all products currently being monitored.
/help - Show this help message.

*Example Usage:*

To monitor the same product for a specific pincode (e.g., Vapi):
\`/monitor https://shop.amul.com/en/product/amul-high-protein-rose-lassi-200-ml-or-pack-of-30 396191\`
`, { parse_mode: 'Markdown' });
});

function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

module.exports = { bot,productsCollectionPromise,notificationManager};