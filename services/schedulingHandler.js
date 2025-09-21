const cron = require('node-cron');
const { checkProductAvailability } = require('./webScrapingHandler');
const { bot, productsCollectionPromise,notificationManager } = require('./telegramBotHandler');

// Check products every 10 minutes
const task = cron.schedule(process.env.CHECK_INTERVAL || '*/10 * * * *', async () => {
    console.log('🔄 Running scheduled availability check...');
    const products = await productsCollectionPromise;

    // Get all products from the database
    const allProducts = await products.find({}).toArray();
    if (allProducts.length === 0) {
        console.log('No products to monitor in the database.');
        return;
    }

    for (const product of allProducts) {
        const { _id, url, pincode, lastStatus, chatIds,shortId } = product;

        try {
            console.log(`Checking: ${url} for pincode ${pincode}`);
            const isAvailable = await checkProductAvailability(url, pincode);

            // Update the status in the database
            // await products.updateOne({ _id }, { $set: { lastStatus: isAvailable } });

            // Send notification if status changed to available
            if (!lastStatus && isAvailable) {
                console.log(`📢 Sending stock alerts for ${url}`);
                for (const chatId of chatIds) {
                    await notificationManager.sendStockAlert(chatId, url,shortId);
                }
            }
            console.log(`${url} (${pincode}): ${isAvailable ? '✅ Available' : '❌ Unavailable'}`);
        } catch (error) {
            console.error(`Error checking ${url}:`, error.message);
        }
    }
    console.log('✅ Completed all product checks.');
}, {
    scheduled: false // Don't start immediately
});

async function checkSingleProduct(productData) {
    const { url, pincode, lastStatus, chatIds } = productData;

    try {
        console.log(`Checking: ${url} for pincode ${pincode}`);

        // Pass the specific pincode to the scraping function
        const isAvailable = await checkProductAvailability(url, pincode);
        const wasAvailable = lastStatus;

        // Update status in the original map object
        productData.lastStatus = isAvailable;

        if (!wasAvailable && isAvailable) {
            await notifyUsers(url, chatIds);
        }

        console.log(`${url} (${pincode}): ${isAvailable ? '✅ Available' : '❌ Unavailable'}`);

    } catch (error) {
        console.error(`Error checking ${url}:`, error);

        // Notify users about the error
        const errorMessage = `⚠️ Error checking product availability:
${url}

The bot will continue monitoring and try again on the next scheduled check.`;

        productData.chatIds.forEach(chatId => {
            bot.sendMessage(chatId, errorMessage);
        });
    }
}

async function notifyUsers(url, chatIds) {
    const message = `🎉 *PRODUCT AVAILABLE!* 🎉

The product you were monitoring is now in stock:

🔗 ${url}

🏃‍♂️ *Quick! Go grab it before it's out of stock again!*

Use /stop ${url} to stop monitoring this product.`;

    const notificationPromises = chatIds.map(chatId =>
        bot.sendMessage(chatId, message, {
            parse_mode: 'Markdown',
            disable_web_page_preview: false
        }).catch(err => {
            console.error(`Failed to send notification to ${chatId}:`, err);
        })
    );

    await Promise.all(notificationPromises);
    console.log(`📢 Sent notifications to ${chatIds.length} users`);
}

// Function to start the scheduler
function startScheduler() {
    task.start();
    console.log('📅 Product availability scheduler started');
    console.log(`⏰ Check interval: ${process.env.CHECK_INTERVAL || '*/10 * * * *'}`);
}

// Function to stop the scheduler
function stopScheduler() {
    task.stop();
    console.log('⏹️ Product availability scheduler stopped');
}

// Manual check function for testing
async function runManualCheck() {
    console.log('🔄 Running manual check...');

    for (const [url, productData] of monitoredProducts) {
        await checkSingleProduct(url, productData);
        // Add delay between checks to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
}

module.exports = {
    startScheduler,
    stopScheduler,
    runManualCheck
};