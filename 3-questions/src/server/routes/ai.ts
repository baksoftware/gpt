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

    const prompt = `Given the topic or question "${nodeName}", generate 2-3 relevant follow-up questions or subtopics. 
    Return them as a concise list without numbering or bullets.
    Each response should be a natural follow-up question or subtopic that helps explore the main topic further.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that generates relevant follow-up questions and subtopics. Keep responses concise and natural."
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