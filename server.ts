import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '5mb' }));

  // Health & Backend Configuration Endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'EduVault Native Android & Gemini AI Backend',
      model: 'gemini-3.8-flash',
    });
  });

  // Download Complete Native Android Studio Project (ZIP) to build signed eduvault.apk
  app.get('/api/android/download-project', (_req, res) => {
    try {
      const zipPath = '/tmp/eduvault-android-project.zip';
      if (fs.existsSync(zipPath)) {
        fs.unlinkSync(zipPath);
      }
      execSync(
        'zip -r /tmp/eduvault-android-project.zip android .github firestore.rules storage.rules ANDROID_FIREBASE_BUILD_GUIDE.md',
        { cwd: process.cwd() }
      );
      res.download(zipPath, 'EduVault-Native-Android-Studio.zip');
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: msg });
    }
  });

  // Secure Gemini AI PDF Assistant Endpoint
  app.post('/api/ai/pdf-assistant', async (req, res) => {
    try {
      const {
        materialTitle = '',
        subject = 'General',
        board = 'WBCHSE',
        language = 'bn',
        taskType = 'custom',
        question = '',
        documentExcerpt = '',
      } = req.body || {};

      const langInstruction =
        language === 'bn'
          ? 'Respond in clear, natural academic Bengali (বাংলা) suitable for West Bengal Board (WBCHSE/WBBSE) students. Use Bengali script (Hind Siliguri compatible) and include mathematical formulas clearly.'
          : 'Respond in clear, concise academic English suitable for West Bengal Board (WBCHSE/WBBSE) students. Include Bengali key terms in parentheses when helpful.';

      const docContext = documentExcerpt
        ? `Active Uploaded PDF: "${materialTitle}" (${board} - ${subject})\nUploaded Document Content:\n${documentExcerpt}`
        : `No specific PDF excerpt provided. Answer for West Bengal Board (${board}) ${subject}.`;

      let taskPrompt = question;
      if (taskType === 'summary') {
        taskPrompt = `Provide a structured, exam-oriented chapter summary of "${materialTitle || subject}" (${board}) with key definitions, formulas, and page references.`;
      } else if (taskType === 'important_points') {
        taskPrompt = `List the top 5 most important board exam questions and key points from "${materialTitle || subject}" (${board}) with step-by-step explanations.`;
      } else if (taskType === 'explain_bn') {
        taskPrompt = `Explain the core concepts and equations of "${materialTitle || subject}" in simple, easy-to-remember Bengali (সহজ বাংলায় ব্যাখ্যা করো) with real-life examples.`;
      } else if (taskType === 'mcq') {
        taskPrompt = `Generate 3 high-yield WBCHSE/WBBSE board-style Multiple Choice Questions (MCQs) from "${materialTitle || subject}" with 4 options (A, B, C, D), the correct answer, and a brief explanation.`;
      }

      const systemInstruction = `You are the EduVault AI PDF Study Assistant for West Bengal Board (${board}) Class 9-12 students.
${langInstruction}
Always ground your explanation in the uploaded PDF content when provided, and cite relevant page numbers (e.g., [Page 1]). Keep formatting clean, structured, and easy to read on an Android screen.`;

      const fullPrompt = `${docContext}\n\nStudent Request: ${taskPrompt}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: fullPrompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              answer: {
                type: Type.STRING,
                description: 'Well-structured study explanation, summary, or solution.',
              },
              pageReferences: {
                type: Type.ARRAY,
                items: { type: Type.INTEGER },
                description: 'Referenced PDF page numbers such as [1].',
              },
              followUpSuggestion: {
                type: Type.STRING,
                description: 'One short suggested follow-up question for the student.',
              },
            },
            required: ['answer', 'pageReferences', 'followUpSuggestion'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json({
        answer: parsed.answer || response.text || 'Explanation prepared.',
        pageReferences: Array.isArray(parsed.pageReferences) ? parsed.pageReferences : [1],
        followUpSuggestion: parsed.followUpSuggestion || 'Ask a follow-up question from this chapter',
        modelUsed: 'gemini-3.8-flash',
      });
    } catch (error: unknown) {
      const errMessage = error instanceof Error ? error.message : String(error);
      console.error('Gemini PDF Assistant Error:', errMessage);
      res.status(500).json({
        error: errMessage,
        message: 'Failed to generate AI study response. Please verify your Gemini API configuration.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`EduVault Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
