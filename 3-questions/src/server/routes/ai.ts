import express from 'express';
import OpenAI from 'openai';
import { config } from '../../config/config.ts';

const router = express.Router();
const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

router.post('/models', async (_req, res) => {
  const models = await openai.models.list();
  res.json(models);
});


router.post('/generate-subnodes', async (req, res) => {
  try {
    const { nodeName } = req.body;

    if (!nodeName) {
      res.status(400).json({ error: 'nodeName is required' });
      return;
    }

    const prompt = `Given the topic or question "${nodeName}", generate the answer and 2-3 relevant follow-up questions or subtopics.
    
    Return the answer as one paragraph and less than 100 words, prefixed with "Answer:". Ensure it is only one line.
    
    Return each follow up question as one paragraph, prefixed with "Follow up:". Make sure it is only one line. Ensure the follow up questions are natural and relevant to the answer.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that generates relevant answers and follow-up questions and subtopics. Keep responses concise and natural."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 150
    });

    const generatedText = response.choices[0]?.message?.content || '';
    const subnodes = generatedText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .slice(0, 3);

    res.json({ subnodes });
  } catch (error) {
    console.error('Error generating subnodes:', error);
    res.status(500).json({ 
      error: 'Failed to generate subnodes',
      subnodes: [`failed to generate subnodes`]
    });
  }
});

export { router }; 