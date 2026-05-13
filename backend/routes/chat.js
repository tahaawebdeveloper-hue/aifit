const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');

router.post('/', protect, async (req, res) => {
  try {
    const { message, profile, history = [] } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const apiKey = process.env.GROQ_API_KEY;
    console.log('Groq Key loaded:', apiKey ? 'YES - ' + apiKey.slice(0, 10) + '...' : 'NO - MISSING');

    if (!apiKey) {
      return res.status(500).json({ success: false, message: 'AI service not configured' });
    }

    const goalNames     = ['Weight Loss', 'Muscle Gain', 'Maintenance'];
    const activityNames = ['', 'Sedentary', 'Moderate', 'Active'];

    const systemPrompt = profile
      ? `You are FitAI, a personal fitness coach assistant embedded inside a fitness tracking app.

You have full access to this user's current fitness profile:
- Weight: ${profile.weight}kg
- Height: ${profile.height}cm
- Age: ${profile.age} years
- BMI: ${profile.bmi} (${profile.bmiCategory})
- Goal: ${goalNames[profile.goal] ?? 'Unknown'}
- Activity Level: ${activityNames[profile.activityLevel] ?? 'Unknown'}
- Daily Calorie Target: ${profile.dailyCalories} kcal/day
- Workout Type: ${profile.workoutType}
- Workout Plan: ${(profile.workoutPlan || []).join(', ')}
- Macros: Protein ${profile.macros?.protein}g, Carbs ${profile.macros?.carbs}g, Fats ${profile.macros?.fats}g
- Weeks to Goal: ${profile.weeksToGoal ?? 'N/A'}
- Target Weight: ${profile.targetWeight ?? 'Not set'}kg

Rules:
1. Give SHORT, direct answers (2-4 sentences max unless a list is genuinely needed).
2. Always personalise to the user's real numbers above — never give generic advice.
3. Be encouraging but honest. Don't exaggerate.
4. Use plain text — no markdown headers, no asterisks. Just clean sentences.`
      : `You are FitAI, a helpful fitness coach. Give concise, practical advice in 2-4 sentences. No markdown formatting.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        max_tokens: 300,
        temperature: 0.7,
        messages: [
          { role: 'system', content: systemPrompt },
          ...history.slice(-6).map(h => ({
            role: h.role === 'assistant' ? 'assistant' : 'user',
            content: h.content
          })),
          { role: 'user', content: message }
        ]
      })
    });

    if (!response.ok) {
      const err = await response.json();
      console.error('Groq API error:', JSON.stringify(err, null, 2));
      return res.status(502).json({ success: false, message: 'AI service error' });
    }

    const data  = await response.json();
    const reply = data.choices?.[0]?.message?.content
                  ?? 'Sorry, I could not generate a response.';

    res.json({ success: true, reply });

  } catch (err) {
    console.error('Chat route error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;