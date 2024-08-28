require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const puppeteer = require("puppeteer");
const axios = require('axios');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Serve the HTML form
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'form.html'));
});

app.post('/scrape', async (req, res) => {
  const { url } = req.body;

  try {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url, { timeout: 1200000 });

    const visibleTexts = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6, p, a, li, span, div"))
        .filter((element) => element.offsetWidth > 0 && element.offsetHeight > 0)
        .map(element => element.innerText.trim());
    });

    console.log('Visible texts:', visibleTexts);
    const textContent = visibleTexts.filter(Boolean).join(', ');
    fs.writeFileSync('scraped_text.txt', textContent);

    const prompt = 'Extract the following information from the text: company name, type of product, ideal user.\n\n';

    const result = await makeOpenAICall(prompt);

    const extractInfo = (text, key) => {
      const regex = new RegExp(`${key}:\\s*(.+)`, 'i');
      const match = text.match(regex);
      return match ? match[1].trim() : 'Not found';
    };

    const companyName = extractInfo(result, 'Company name');
    const productName = extractInfo(result, 'Type of product');
    const idealUser = extractInfo(result, 'Ideal user');

    const extractedInfo = {
      companyName: companyName,
      typeOfProduct: productName,
      idealUser: idealUser
    };
    fs.writeFileSync('extracted_info.json', JSON.stringify(extractedInfo, null, 2));

    await browser.close();

    // Send both extracted info and generated content back to the client
    const generatedContent = await generateContent(companyName, productName, idealUser);
    res.json({ extractedInfo, generatedContent });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to scrape the webpage' });
  }
});

app.listen(3002, () => {
  console.log('Server is running on http://localhost:3002');
});

process.on('SIGINT', () => {
  console.log("Shutting down server...");
  process.exit();
});

// Chat gpt configuration
async function makeOpenAICall(prompt) {
  try {
    const fileText = fs.readFileSync('scraped_text.txt', 'utf8');
    const payload = {
      model: "gpt-3.5-turbo", // Use the GPT-3.5-turbo model
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: `${prompt}\n\nFile content:\n${fileText}` }
      ]
    };

    const response = await axios.post('https://api.openai.com/v1/chat/completions', payload, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
    throw error;
  }
}

// Add your tweet, Instagram post, and blog generation functions here
// Function to generate tweets
async function generateTweets(companyName, productName, idealUser) {
  const prompt = `
    Write the first 5 Tweets for my company ${companyName}.
    Our main product revolves around ${productName} and the ideal user is ${idealUser}.
    Rules:
    1. No hashtags
    2. Tweet 1 should be about the launch
    3. Tweet 2 should be about the problem the product solves
    4. Tweet 3 should be about how the product solves the problem
    5. Tweet 4 should be about testimonials
    6. Tweet 5 should be funny and engaging content
    Each tweet should be in a separate line in an organised manner 
  `;

  const response = await makeOpenAICall(prompt);
  return response;
}

// Function to generate Instagram posts
async function getPosts(companyName, productName, idealUser) {
  const prompt = `
    Write the first 10 Instagram posts for my company ${companyName} in the format:
    1. Caption
    2. Slide 1 Content
    3. Slide 2 Content
    Our main product revolves around ${productName} and the ideal user is ${idealUser}.
    Each post idea should have a newline space between it so that the written content is visible in an organised way
  `;

  const response = await makeOpenAICall(prompt);
  return response;
}

async function getBlogs(companyName, productName, idealUser) {
  const prompt = `
    Write the first 5 blogs for my company ${companyName}.
    Our main product revolves around ${productName} and the ideal user is ${idealUser}.
    Separate each blog by a newline. There needs to be a visible difference in each blog post.
  `;

  const response = await makeOpenAICall(prompt);
  return response;
}


async function generateContent(companyName, productName, idealUser) {
  try {
   
    const tweets = await generateTweets(companyName, productName, idealUser);

    const posts = await getPosts(companyName, productName, idealUser);

    const blogs = await getBlogs(companyName, productName, idealUser);

    const content = `
      Tweets:\n${tweets}\n\n
      Instagram Posts:\n${posts}\n\n
      Blogs:\n${blogs}\n
    `;

    return content;
  } catch (error) {
    console.error('Error generating content:', error);
    throw error;
  }
}
