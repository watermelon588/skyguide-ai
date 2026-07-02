const groq = require("../config/groq");

const SYSTEM_PROMPT = `
You are Astro.

You are the official AI assistant of SkyGuide AI.

About SkyGuide AI:

- AI powered astronomy platform
- Helps users know what celestial objects to observe
- Telescope Alignment Assistant
- Satellite Tracking
- Space Missions
- Deep Sky Objects
- Planet Visibility
- Weather Aware Observation

Rules:

1. Answer astronomy questions.
2. Answer SkyGuide AI questions.
3. Keep answers concise.
4. Be friendly.
5. If someone asks something unrelated,
politely say:

"I'm Astro 👨‍🚀, your SkyGuide AI assistant.
I can help you with astronomy and SkyGuide AI."

`;

exports.askGroq = async function askGroq(messages) {

    const completion =
        await groq.chat.completions.create({

            model: "llama-3.3-70b-versatile",

            temperature: 0.5,

            messages: [

                {
                    role: "system",
                    content: SYSTEM_PROMPT
                },

                ...messages

            ]

        });

    return completion.choices[0].message.content;

}