import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

async function callAI(prompt: string): Promise<{ text: string; provider: string }> {
  const openRouterApiKey = process.env.OPENROUTER_API_KEY;
  const geminiApiKey = process.env.GEMINI_API_KEY;

  // Prioritize OpenRouter if configured
  if (openRouterApiKey && openRouterApiKey !== 'YOUR_OPENROUTER_API_KEY_HERE') {
    const model = process.env.OPENROUTER_MODEL || 'google/gemma-4-31b-it:free';
    const res = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openRouterApiKey}`,
        'HTTP-Referer': 'https://hyper-flow.com',
        'X-Title': 'Hyper-Flow',
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.error('OpenRouter API error:', res.status, errorBody);
      throw new Error(`OpenRouter API returned ${res.status}`);
    }

    const json = await res.json();
    const text = json?.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error('No text in OpenRouter response');
    }
    return { text: text.trim(), provider: 'OpenRouter' };
  }

  // Fallback to Gemini
  if (!geminiApiKey || geminiApiKey === 'YOUR_GEMINI_API_KEY_HERE') {
    throw new Error('Neither OPENROUTER_API_KEY nor GEMINI_API_KEY is configured. Please check your environment variables.');
  }

  const res = await fetch(`${GEMINI_API_URL}?key=${geminiApiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
        topP: 0.95,
      },
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error('Gemini API error:', res.status, errorBody);
    throw new Error(`Gemini API returned ${res.status}`);
  }

  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('No text in Gemini response');
  }
  return { text: text.trim(), provider: 'Gemini' };
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    let isPro = false;
    let currentCount = 0;
    const maxFreeRequests = 5;

    if (userId) {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      isPro = (user.publicMetadata?.plan as string) === 'Pro Plan';
      currentCount = (user.publicMetadata?.aiUsageCount as number) || 0;
      
      if (!isPro && currentCount >= maxFreeRequests) {
        return NextResponse.json({ 
          success: false, 
          error: 'LIMIT_REACHED', 
          message: 'You have reached your free trial limit of 5 AI requests. Please upgrade to Pro.',
          isPro,
          aiUsageCount: currentCount,
          maxFreeRequests
        }, { status: 403 });
      }
    }

    const body = await request.json();
    const { type } = body;

    // Helper function to handle count increments and responses
    const handleResponse = async (resultPromise: Promise<{ text: string; provider: string }>, resField: string) => {
      const { text, provider } = await resultPromise;
      
      // Increment count on successful response if not Pro
      if (userId && !isPro) {
        const client = await clerkClient();
        currentCount += 1;
        await client.users.updateUserMetadata(userId, {
          publicMetadata: {
            aiUsageCount: currentCount
          }
        });
      }

      return NextResponse.json({
        success: true,
        [resField]: text,
        provider,
        isPro,
        aiUsageCount: currentCount,
        maxFreeRequests
      });
    };

    if (type === 'summarize') {
      const { subject, emailBody } = body;
      if (!subject || !emailBody) {
        return NextResponse.json({ success: false, error: 'Missing subject or emailBody' }, { status: 400 });
      }

      const prompt = `You are a concise email summarizer for a productivity dashboard.
Summarize the following email in 2-3 short sentences. Focus on the key action items, requests, or information.
Do NOT use markdown formatting. Write plain text only.

Subject: ${subject}
Body:
${emailBody}`;

      return await handleResponse(callAI(prompt), 'summary');

    } else if (type === 'smart-reply') {
      const { subject, emailBody, senderName } = body;
      if (!subject || !emailBody) {
        return NextResponse.json({ success: false, error: 'Missing subject or emailBody' }, { status: 400 });
      }

      const prompt = `You are a smart email reply assistant for a productivity dashboard.
Given the email below, generate exactly 3 reply suggestions with different tones.
Return ONLY a valid JSON array with 3 objects, each having "tone" and "text" fields.
The tones must be: "Professional", "Casual", "Brief".
Each reply should be 1-3 sentences, addressed to ${senderName || 'the sender'}.
Do NOT include any markdown, code fences, or extra text outside the JSON array.

Subject: ${subject}
Email body:
${emailBody}

Return format: [{"tone":"Professional","text":"..."},{"tone":"Casual","text":"..."},{"tone":"Brief","text":"..."}]`;

      const { text: raw, provider } = await callAI(prompt);
      // Parse the JSON from the response, handling potential markdown fences
      let cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      // Find the JSON array
      const startIdx = cleaned.indexOf('[');
      const endIdx = cleaned.lastIndexOf(']');
      if (startIdx !== -1 && endIdx !== -1) {
        cleaned = cleaned.substring(startIdx, endIdx + 1);
      }
      
      let replies;
      try {
        replies = JSON.parse(cleaned);
      } catch {
        // Fallback if parsing fails
        replies = [
          { tone: 'Professional', text: 'Thank you for your email. I will review this and get back to you shortly.' },
          { tone: 'Casual', text: 'Got it, thanks! Will take a look and follow up soon.' },
          { tone: 'Brief', text: 'Noted. Will review.' },
        ];
      }

      // Increment count on successful response if not Pro
      if (userId && !isPro) {
        const client = await clerkClient();
        currentCount += 1;
        await client.users.updateUserMetadata(userId, {
          publicMetadata: {
            aiUsageCount: currentCount
          }
        });
      }

      return NextResponse.json({
        success: true,
        replies,
        provider,
        isPro,
        aiUsageCount: currentCount,
        maxFreeRequests
      });

    } else if (type === 'daily-briefing') {
      const { emails, events } = body;

      const emailSummaries = (emails || []).slice(0, 8).map((e: any, i: number) =>
        `${i + 1}. From: ${e.from || 'Unknown'} | Subject: ${e.subject || 'No subject'} | Priority: ${e.priority || 'Normal'}`
      ).join('\n');

      const eventSummaries = (events || []).slice(0, 8).map((e: any, i: number) =>
        `${i + 1}. ${e.title || 'Untitled'} at ${e.time || 'TBD'} (${e.duration || 'unknown duration'}) — ${e.status || 'scheduled'}`
      ).join('\n');

      const prompt = `You are a friendly AI assistant on a productivity dashboard called "Hyper-Flow".
Generate a personalized daily briefing in 3-4 sentences. Be warm, insightful, and action-oriented.
Mention the most important emails and upcoming meetings by name. Suggest priorities.
Do NOT use markdown. Write plain text only. Address the user directly as "you".

Today's Emails (${(emails || []).length} total):
${emailSummaries || 'No emails loaded yet.'}

Today's Calendar (${(events || []).length} events):
${eventSummaries || 'No events scheduled.'}

Current time: ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;

      return await handleResponse(callAI(prompt), 'briefing');

    } else if (type === 'parse-event') {
      const { text } = body;
      if (!text) {
        return NextResponse.json({ success: false, error: 'Missing text' }, { status: 400 });
      }

      const prompt = `You are an AI assistant parsing natural language calendar event commands.
Extract event details from the command. Return ONLY a valid JSON object matching the format below.
Do NOT use markdown formatting, code blocks, or extra text.

Command: "${text}"

Current Year/Month/Date reference is: June 16, 2026 (Tuesday)

Return format:
{
  "title": "...",
  "startTime": "...", // e.g. "09:00 AM", "03:30 PM" (must format exactly with space and AM/PM)
  "endTime": "...",   // e.g. "10:00 AM", "04:15 PM" (must format exactly with space and AM/PM)
  "eventType": "...", // must be one of: "Meeting", "Task", "Reminder", "Focus Time"
  "agenda": "...",    // description notes
  "platform": "...",  // optional for Meeting: "Zoom", "Google Meet", "Slack Call", "Discord"
  "meetingLink": "...", // optional placeholder: "https://zoom.us/j/123456"
  "attendees": "...", // optional names/emails
  "priority": "...",  // optional for Task: "High", "Medium", "Low"
  "assignee": "...",  // optional for Task
  "alertType": "...", // optional for Reminder: "Notification Badge", "Alert Window", "Silent"
  "focusCategory": "...", // optional for Focus Time: "Coding", "Design Review", "Deep Work"
  "focusTopic": "..." // optional for Focus Time
}`;

      const { text: raw, provider } = await callAI(prompt);
      let cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      const startIdx = cleaned.indexOf('{');
      const endIdx = cleaned.lastIndexOf('}');
      if (startIdx !== -1 && endIdx !== -1) {
        cleaned = cleaned.substring(startIdx, endIdx + 1);
      }
      
      let parsedEvent;
      try {
        parsedEvent = JSON.parse(cleaned);
      } catch {
        return NextResponse.json({ success: false, error: 'Failed to parse AI response' }, { status: 500 });
      }

      // Increment count on successful response if not Pro
      if (userId && !isPro) {
        const client = await clerkClient();
        currentCount += 1;
        await client.users.updateUserMetadata(userId, {
          publicMetadata: {
            aiUsageCount: currentCount
          }
        });
      }

      return NextResponse.json({
        success: true,
        event: parsedEvent,
        provider,
        isPro,
        aiUsageCount: currentCount,
        maxFreeRequests
      });

    } else if (type === 'draft-email') {
      const { prompt: userPrompt, subject, emailBody, senderName } = body;
      if (!userPrompt) {
        return NextResponse.json({ success: false, error: 'Missing prompt' }, { status: 400 });
      }

      const prompt = `You are a professional email writing assistant for a productivity dashboard.
Draft a reply to the email below based on the user's instructions.
Address the recipient by name if available, otherwise write a general reply.
Return ONLY the raw drafted email body text. Do NOT use markdown. Do NOT write anything else.

User Instructions: ${userPrompt}
Original Subject: ${subject || 'No Subject'}
Original Sender: ${senderName || 'No Name'}
Original Email:
${emailBody || 'No email content.'}`;

      return await handleResponse(callAI(prompt), 'draft');

    } else {
      return NextResponse.json({ success: false, error: `Unknown action type: ${type}` }, { status: 400 });
    }
  } catch (err: any) {
    console.error('AI API error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal server error' }, { status: 500 });
  }
}
