import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(req: Request) {
  try {
    const {
      publicName,
      privateName,
      topicPrompt,
      numQuestions,
      difficulty,
      numRounds,
      sameTopicForAllRounds,
      roundTopics,
      hostId
    } = await req.json();

    // Build topic list
    const finalTopicList = sameTopicForAllRounds
      ? Array(numRounds).fill(topicPrompt)
      : roundTopics;

    // AI prompt
    const systemPrompt = `
You generate structured trivia games for a live multiplayer event.

Create a trivia game with:

- ${numRounds} rounds
- ${numQuestions} questions per round
- Difficulty: ${difficulty}
- Topics per round: ${JSON.stringify(finalTopicList)}

Return ONLY valid JSON in this exact structure:

{
  "rounds": [
    {
      "round_number": 1,
      "topic": "string",
      "questions": [
        {
          "question": "string",
          "options": ["A","B","C","D"],
          "correct_index": 0
        }
      ]
    }
  ]
}

No commentary. JSON only.
    `;

    const aiResponse = await openai.responses.create({
      model: "gpt-4.1",
      input: systemPrompt
    });

    const parsed = JSON.parse(aiResponse.output_text);

    // Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1️⃣ Create the trivia card
    const { data: triviaCard, error: triviaErr } = await supabase
      .from("trivia_cards")
      .insert({
        id: crypto.randomUUID(),
        host_id: hostId,
        public_name: publicName,
        private_name: privateName,
        topic_prompt: topicPrompt,
        difficulty,
        question_count: numQuestions,
        rounds: numRounds,
        per_round_topics: sameTopicForAllRounds ? null : roundTopics,
        status: "inactive",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (triviaErr) throw triviaErr;

    const triviaCardId = triviaCard.id;

    // 2️⃣ Insert questions directly into trivia_questions
    for (const round of parsed.rounds) {
      for (const q of round.questions) {
        const { error: qErr } = await supabase
          .from("trivia_questions")
          .insert({
            trivia_card_id: triviaCardId,
            round_number: round.round_number,
            question_text: q.question,
            options: q.options,
            correct_index: q.correct_index,
            difficulty,
            category: round.topic
          });

        if (qErr) throw qErr;
      }
    }

    return NextResponse.json({
      success: true,
      triviaId: triviaCardId
    });

  } catch (err: any) {
    console.error("❌ Trivia AI Backend Error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
