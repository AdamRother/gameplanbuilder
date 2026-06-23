import type { Framework, InterviewAnswers, ProofItem } from '@/lib/types'

export const SYSTEM_PROMPT = `You are writing a custom game plan document. This is the logical side of a two-part sales process. The prospect already trusts the consultant. Your job is to deliver certainty, not sell.

CRITICAL RULES:
1. TWO PAGES MAXIMUM when printed. Target 420-480 words. Hard cap at 500. If you go over, cut — do not summarize, just cut.
2. Speak directly to the prospect in second person throughout. Use "you" and "your." Reference their exact words, their real numbers, their specific situation. Every sentence must feel like it was written only for this one person — not a template.
3. Certainty comes from saying less, not more. One thought per sentence. Each bullet: one short sentence, 15 words max. No padding, no filler, no restating what was already said.
4. Use the prospect's exact phrases back at them. A wrong diagnosis destroys trust instantly.
5. The solution is ONE named system. State it as fact.
6. Never explain steps technically — show what the step produces for this specific person.
7. RESULT SECTION vs NUMBERS TABLE — PICK EXACTLY ONE based on priority order:
   CASE A: Proof items are provided in the framework → output "## The Result:" with the proof items verbatim. Delete the numbers table entirely.
   CASE B: No proof items + specific numbers or dollar figures exist anywhere (transcript OR consultant's additional context) → output the numbers table only. This is the logical certainty section — it must be SHORT (3-5 rows) and tightly aligned with the framework's acquisition method. Look at the framework steps to determine the channel (webinars, paid ads, cold outreach, referrals, etc.) and build the math around THAT specific funnel. Use the correct metrics for the channel — for example: webinar → registrants/attendees/close rate; paid ads → cost per lead/ROAS/clients; cold outreach → replies/booked calls/close rate. Start from their stated goal and work backwards. Use numbers from the transcript/context first; fill missing metrics with labeled industry averages. Every row must be mathematically consistent. Keep it concise — this must not push the game plan past 2 pages. Delete "## The Result:" entirely.
   CASE C: No proof items + no numbers anywhere → output "## The Result:" with this exact text: "[Case studies, proof, or numbers were not provided — please fill this section in manually before sending.]" Delete the numbers table entirely.
   Never output both sections.
9. Match the prospect's tone exactly. Casual prospect, casual writing.
10. Output only the document. Start directly with the header line.
11. The document header must output the literal text "[PROSPECT NAME] × [YOUR NAME]". Do not substitute real names.
12. Every bullet on one line: - content here. Never a bare dash on its own line.
13. Never use em dashes or en dashes. Use a colon, hyphen, or period instead.
14. The FRAMEWORK STEPS are raw consultant notes. Rewrite each one completely in the prospect's language, tied to their goals and situation. Do not copy verbatim.
15. THE RESULT SECTION must be brief and scannable: the intro sentence is max 12 words; each testimonial is one line; each video is one sentence (why to watch) + the URL. No lead-ins, no transitions, no commentary between items.
16. CRITICAL ADDITIONAL CONTEXT (if provided) overrides the transcript. Every point in it must be visibly reflected in the game plan. It is the consultant's authoritative correction — treat it as more reliable than anything said in the call.`

const TEMPLATE = `# [PROSPECT NAME] × [YOUR NAME]

Hey [first name], I have finished designing your game plan, and it's awesome! Let's break it down:

## Let's Recap:

**Here is where you are currently at:**
- [Specific data point from their situation — use their exact words]
- [Specific data that expands the main problem]
- [Specific data that expands the main problem]

**This is where we want to get you to:**
- [Specific outcome they described]
- [Specific fulfilled desire they mentioned]

**Why? Because:** [Reiterate the emotional reason they gave. Reference their exact words.]

**Here Is The Issue:** [State the exact core problem in plain language. Make it feel like you read their mind.]

**[1-2 sentences: why solving this one issue is all they need. Their skills and offer are in place — this is the missing piece.]**

**[1-2 sentences: why they'll never get what they want without solving this. Their current approach cannot get them there.]**

## So, How Do We Do This In 30 Days Or Less?

**Answer:** [FRAMEWORK NAME]

[1-2 sentences on why you are the right person to solve this — your experience with this exact problem or your insight into their situation.]

### Step 1: [STEP 1 NAME]
- **Here's why:** [1-2 sentences. Why this step matters for this specific person's situation.]
- **If you don't do this:** [1-2 sentences. What stays broken for them specifically.]
- **But once you do this:** [1-2 sentences. The specific result tied to their goal.]

### Step 2: [STEP 2 NAME]
- **Here's why:** [1-2 sentences tied to their situation]
- **If you don't do this:** [1-2 sentences]
- **But once you do this:** [1-2 sentences tied to their goal]

### Step 3: [STEP 3 NAME]
- **Here's why:** [1-2 sentences tied to their situation]
- **If you don't do this:** [1-2 sentences]
- **But once you do this:** [1-2 sentences tied to their goal]

[STEP 4 — only if 4 steps defined. Format as: ### Step 4: [STEP 4 NAME] with same bullets. Delete entirely if 3 steps.]

This is what you need to do: [Step 1]. [Step 2]. [Step 3][. Step 4].

(OUTPUT EXACTLY ONE of the following blocks — never both. See rule 7.)

CASE A — framework proof items exist: output "## The Result:" using the proof items verbatim.

CASE B — no proof items, but numbers or dollar figures exist in the transcript OR additional context: use those numbers to build the table showing how the prospect reaches their stated goal. Output this block only (no Result section):

## Here Is How You Reach [THEIR SPECIFIC GOAL]

| | The Math |
|---|---|
| Revenue goal | $[goal]/month |
| [metric 1 — matched to framework channel] | [value] |
| [metric 2 — matched to framework channel] | [value] |
| [metric 3 — matched to framework channel] | [value] |

[1 sentence tying the numbers to their goal — keep it one line.]

CASE C — no proof items, no numbers anywhere: output this block:

## The Result:

[Case studies, proof, or numbers were not provided — please fill this section in manually before sending.]

## Do You Know What This Means?

[Show them specifically what they are missing out on by not solving this — contrast the result with their current reality. Reference their numbers or timeline if mentioned.]

[1 sentence: the only thing standing between where they are now and where they want to be is solving this issue.]

## Now What?

Because of all the research I've already done on this, I can tell you with certainty that I can solve this problem for you and help you make a ton more money.

If what I laid out makes sense to you, and you really do want [their goal in their exact words], then I think it is a no brainer for us to at least have a conversation about what this could look like.

If you agree, text me back, or book a call here.`

function formatProofItems(items: ProofItem[]): string {
  if (!items || items.length === 0) {
    return 'PROOF ITEMS: None provided. Apply rule 7: if specific numbers or dollar figures appear anywhere in the transcript OR in the consultant\'s additional context → output the numbers table only (CASE B). Keep the table SHORT — 3 to 5 rows maximum, no more. Look at the framework steps to identify the acquisition channel (webinars, paid ads, cold outreach, referrals, etc.) and use the correct metrics for that channel. Work backwards from their goal: revenue goal → deal size → clients/month → then 1-2 channel-specific metrics (e.g. close rate and calls needed for outreach; registrants and show rate for webinars; CPL and ROAS for ads). Use numbers from transcript/context first; fill missing metrics with labeled industry averages. Every row must be mathematically consistent. The table must not push the document past 2 pages. Omit "## The Result:" entirely. If no numbers exist anywhere → output "## The Result:" with this exact line: "[Case studies, proof, or numbers were not provided — please fill this section in manually before sending.]" (CASE C), omit the numbers table entirely.'
  }

  // Proof items exist → numbers table is suppressed entirely
  const nonVideoItems = items.filter(it => it.type !== 'video' || !it.url)
  const videoItems    = items.filter(it => it.type === 'video' && it.url)

  const lines: string[] = [
    'PROOF ITEMS PROVIDED — this is CASE A (see rule 7). STRICT LENGTH RULES:',
    '  a) Delete the numbers table entirely. Output only "## The Result:" section.',
    '  b) Under "## The Result:" heading: write exactly ONE sentence (max 12 words) about the result this prospect can expect. No filler, no setup — just the result.',
    '  c) Then output each item in the VERBATIM ITEMS block exactly as written. Do not add commentary, setup text, or transitions between items.',
    '  d) Then for each VIDEO item: write exactly ONE sentence (max 12 words) on WHY the prospect should watch — what they will discover. Then "Watch: [url]" on its own line. Nothing else.',
  ]

  if (nonVideoItems.length > 0) {
    lines.push('', 'VERBATIM ITEMS (copy exactly, no changes):')
    nonVideoItems.forEach(item => {
      if (item.type === 'testimonial' && item.quote) {
        lines.push(`> "${item.quote}" — ${item.attribution ?? ''}`)
      } else if (item.type === 'result' && item.description) {
        lines.push(`- ${item.description}`)
      }
    })
  }

  if (videoItems.length > 0) {
    lines.push('', 'VIDEO ITEMS — exactly 1 sentence max 12 words (why they should watch), then "Watch: [url]". Nothing else.')
    videoItems.forEach(item => {
      lines.push(`Context (do not copy): "${item.description ?? ''}" | URL: ${item.url}`)
    })
  }

  return lines.join('\n')
}

function formatStep(s: import('@/lib/types').Step, i: number): string {
  const header = `Step ${i + 1}: ${s.name}`
  if (s.heresWhy || s.ifYouDont || s.onceYouDo) {
    const lines = [header]
    if (s.heresWhy)  lines.push(`  Here's why: ${s.heresWhy}`)
    if (s.ifYouDont) lines.push(`  If you don't do this: ${s.ifYouDont}`)
    if (s.onceYouDo) lines.push(`  But once you do this: ${s.onceYouDo}`)
    return lines.join('\n')
  }
  return s.notes ? `${header} — ${s.notes}` : header
}

function stepsBlock(framework: Framework, overrideName?: string, overrideBrainDump?: string): string {
  if (overrideBrainDump) {
    return `Framework: ${overrideName || framework.frameworkName}\n${overrideBrainDump}`
  }
  return framework.steps
    .slice(0, framework.stepCount)
    .map((s, i) => formatStep(s, i))
    .join('\n')
}

export function buildTranscriptPrompt(
  framework: Framework,
  transcript: string,
  notes?: string,
): { system: string; userMessage: string } {
  const proofBlock = formatProofItems(framework.proofItems ?? [])

  const notesBlock = notes?.trim()
    ? `\n⚠️ CONSULTANT OVERRIDES — READ BEFORE WRITING — HIGHEST PRIORITY ⚠️\nThe consultant has provided the following instructions. These are binding rules that override the transcript completely:\n- If an instruction says to INCLUDE something: it must appear in the output.\n- If an instruction says to EXCLUDE, REMOVE, or NOT INCLUDE something: that content must be completely absent from the output — no exceptions.\n- If an instruction contradicts the transcript: the instruction wins.\n- If the instructions contain numbers or dollar figures, treat them as valid data for the numbers table (rule 7, CASE B).\nCONSULTANT INSTRUCTIONS:\n${notes.trim()}\nDo not proceed to write the document until you have internalized every instruction above.\n`
    : ''

  const userMessage = `FRAMEWORK NAME: ${framework.frameworkName}

FRAMEWORK STEPS (consultant's raw notes — rewrite for this specific prospect, do not copy verbatim):
${stepsBlock(framework)}

${proofBlock}

TRANSCRIPT:
${transcript}
${notesBlock}
TEMPLATE TO FOLLOW EXACTLY:

${TEMPLATE}`

  return { system: SYSTEM_PROMPT, userMessage }
}

export function buildInterviewPrompt(
  framework: Framework,
  answers: InterviewAnswers,
): { system: string; userMessage: string } {
  const frameworkName = answers.q7 || framework.frameworkName
  const proofBlock = formatProofItems(framework.proofItems ?? [])

  const userMessage = `FRAMEWORK NAME: ${frameworkName}

FRAMEWORK STEPS (consultant's raw notes — rewrite for this specific prospect, do not copy verbatim):
${stepsBlock(framework, answers.q7 || undefined, answers.q8 || undefined)}

${proofBlock}

PROSPECT INTELLIGENCE (consultant's answers about this specific person):

PROSPECT NAME: ${answers.q1 || '[PROSPECT NAME]'}

WHERE THEY ARE NOW (current situation, specific numbers, what's frustrating them):
${answers.q2}

WHERE THEY WANT TO GET TO (dream outcome, their exact words, specific numbers or timeline):
${answers.q3}

THE EMOTIONAL WHY (why this goal matters to them personally):
${answers.q4}

THE CORE PROBLEM AND WHY THEIR CURRENT APPROACH FAILS (root cause + why what they're doing now can't fix it):
${answers.q5}

WHY THE CONSULTANT IS THE RIGHT PERSON TO SOLVE THIS:
${answers.q6}

NUMBERS/PRICING (if any — skip if blank):
${answers.q9}

CALL TO ACTION PREFERENCE:
${answers.q10}

TEMPLATE TO FOLLOW EXACTLY:

${TEMPLATE}`

  return { system: SYSTEM_PROMPT, userMessage }
}

export function buildRewritePrompt(
  fullDocument: string,
  selectedText: string,
  instruction: string,
): { system: string; userMessage: string } {
  return {
    system: `You are editing a section of a custom business game plan document. You will be given the full document for context, the specific highlighted text that needs to be changed, and an instruction for how to change it. Return only the replacement text — nothing else. No explanation, no preamble. Match the tone and style of the rest of the document.`,
    userMessage: `FULL DOCUMENT:
${fullDocument}

HIGHLIGHTED TEXT TO REWRITE:
${selectedText}

INSTRUCTION:
${instruction}`,
  }
}
