const puppeteer = require('puppeteer');
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message }) => {
            return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
        })
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'availability-checker.log' })
    ]
});

async function checkProductAvailability(url, pincode) {
    let browser;

    try {
        browser = await puppeteer.launch({
            headless: true, // Set to false to visually debug
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        });

        const page = await browser.newPage();

        // Set a realistic user agent and viewport
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        await page.setViewport({ width: 1366, height: 768 });

        console.log(`Navigating to product page: ${url}`);

        // Navigate to the product page
        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 60000 // Increased timeout for slower connections
        });

        // --- UPDATED PINCODE HANDLING LOGIC ---
        try {
            // Define a specific selector for the pincode input field
            const pincodeInputSelector = 'input#search[placeholder="Enter Your Pincode"]';

            // Wait for the pincode input to appear, with a 10-second timeout
            const pincodeInput = await page.waitForSelector(pincodeInputSelector, { timeout: 10000 });

            // If the input field is found, the modal is present
            if (pincodeInput) {
                console.log('✅ Delivery pincode modal detected. Submitting pincode...');

                // Use the pincode from environment variables, with a fallback
                // Use the pincode passed into the function
                const effectivePincode = pincode || '396191'; // Fallback just in case
                await pincodeInput.type(effectivePincode);

                // Press the 'Enter' key to submit the form
                console.log('Waiting for 2 seconds before pressing Enter...');
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Press the 'Enter' key to submit the form
                await page.keyboard.press('Enter');

                console.log(`Pincode ${pincode} submitted. Waiting for page to update...`);

                // Wait for the page to process the pincode and update
                await new Promise(resolve => setTimeout(resolve, 4000));
                console.log('Page successfully updated after pincode submission.');
            } else {
                console.log('ℹ️ Pincode modal not found, proceeding directly to availability check.');
            }
        } catch (error) {
            // If the selector isn't found within the timeout, the modal likely didn't appear.
            // This is not an error; we can proceed with the check.
            console.log(error);
        }

        // --- NEW & IMPROVED AVAILABILITY CHECK LOGIC ---
        const addToCartSelector = 'a.add-to-cart[title="Add to Cart"]';
        try {
            // **IMPROVEMENT**: Explicitly wait for the button to appear for up to 7 seconds.
            console.log(`Waiting for "${addToCartSelector}" to appear...`);
            const addToCartButton = await page.waitForSelector(addToCartSelector, { timeout: 5000 });

            // If waitForSelector succeeds, the button exists. Now check if it's disabled.
            const isDisabled = await page.evaluate(el => {
                return el.getAttribute('disabled') === 'true' || el.classList.contains('disabled');
            }, addToCartButton);

            if (isDisabled) {
                console.log('❌ Product is Out of Stock (Add to Cart button is disabled).');
                return false;
            } else {
                console.log('✅ Product is IN STOCK (Add to Cart button is active).');
                return true;
            }
        } catch (error) {
            // **IMPROVEMENT**: This block now runs if the button does NOT appear within the timeout.
            console.log('⚠️ "Add to Cart" button did not appear. Checking for "out of stock" text...');
            const isOutOfStockTextVisible = await page.evaluate(() => {
                const bodyText = document.body.innerText.toLowerCase();
                const keywords = ['out of stock', 'sold out', 'unavailable'];
                return keywords.some(keyword => bodyText.includes(keyword));
            });

            if (isOutOfStockTextVisible) {
                console.log('❌ Product is Out of Stock (text indicator found).');
                return false;
            }
        }

        // Final fallback
        console.log('⚠️ Could not determine stock status. Assuming out of stock to be safe.');
        return false;

    } catch (error) {
        console.error('Error during product availability check:', error.message);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

module.exports = {
    checkProductAvailability
};

module.exports = { checkProductAvailability };
