# FLUENT180 — AI ENGLISH & CAREER COACH
## Master Build Specification (v2.0)

> **How to use this document.** Paste it in full into your AI coding agent (Claude Code, Cursor, Lovable, Bolt, Replit Agent, etc.). It is written as a binding engineering specification: every section states *what* to build, *how* it must behave, and *how you will know it works*. Where a decision is left to the builder, it is marked **[BUILDER DECISION]**.

---

## 0. ROLE AND OPERATING INSTRUCTIONS FOR THE BUILDER

You are a senior full-stack engineer, a learning-science specialist and an applied-AI architect working as one team. You are building a production application, not a prototype, not a mockup and not a landing page.

**Operating rules**

1. **Inspect before you build.** Read the existing repository (if any), detect the stack, and state your architecture in ≤15 lines before writing code.
2. **Ship vertical slices.** Each milestone in §20 must be runnable end-to-end (UI → API → engine → database) before the next begins.
3. **No fake functionality.** A button either works or does not exist. If a feature needs an external key, build the full integration, read the key from an environment variable, and show a clear "Not configured — set `XYZ_API_KEY`" state in the UI.
4. **Deterministic core, generative surface.** Scoring aggregation, thresholds, mastery, spaced repetition, streaks and plan decisions are **deterministic code** with unit tests. The LLM generates content and produces *structured* evaluations; it never directly decides progression.
5. **Every LLM call is typed.** All AI outputs are validated against a JSON schema (Zod/Pydantic). Invalid output → one repair retry → graceful fallback. Never render raw model text as a score.
6. **Tests are part of done.** Each engine module ships with unit tests covering the rules in this document.
7. **Final report.** When finished, output: what was built, what is fully functional, what requires keys, how to run it, how the adaptive engine works, how scoring works, and the prioritised backlog.

---

## 1. PRODUCT DEFINITION

**One-line:** A personal AI coach that takes an adult A2–B1 English learner to confident, professional, interview-ready English in 180 days through daily adaptive practice.

**North-star outcome:** *The learner becomes a measurably more capable English communicator at work in 180 days* — not "completes 180 lessons".

**Transformation arc:**
`A2/B1 → confident everyday English → fluent conversation → workplace English → professional communication → interview & workplace readiness`

**The product must feel like one teacher who remembers everything.** A mistake on Day 12 can shape an exercise on Day 37. An interview weakness on Day 130 creates speaking drills on Day 131.

**The learner must never ask "What should I study today?"** The app always answers:
- Morning → *Here is today's plan.*
- Each task → *Here is your task.*
- After each task → *Here is your score and what to fix.*
- End of day → *Here is my decision and what happens tomorrow.*

---

## 2. PERSONAS AND ROLES

| Role | Description | Permissions |
|---|---|---|
| **Learner** (primary) | Adult, A2–B1, relocating to / working in Dubai (configurable), wants employability, meetings, emails, interviews. | Full access to own data. |
| **Coach / Partner** (optional) | Spouse, mentor or tutor invited by the learner. | Read-only summary metrics. **No** transcripts, writing or conversations unless the learner grants `share_content = true`. Access revocable at any time. |
| **Admin** (operator) | Maintains curriculum, thresholds, prompt versions. | Config screens, content QA queue, no access to private learner content by default. |

**Editable learner profile fields:** name, age range, current country, target country, native language, self-reported level (or "I don't know"), target level, current profession, target profession, industry, years of experience, education, career goals, interview target (role + date), daily time budget (30/60/90/120 min), preferred study time, English-only preference.

---

## 3. SYSTEM ARCHITECTURE

**Recommended stack [BUILDER DECISION if a repo exists]:**
- **Frontend:** Next.js (App Router) + TypeScript + Tailwind + shadcn/ui; Recharts for charts; PWA installable.
- **Backend:** Next.js route handlers or a separate Node/TS service; background jobs via a queue (BullMQ / Inngest / cron).
- **Database:** PostgreSQL (Prisma or Drizzle). Supabase is acceptable.
- **Auth:** email magic link + Google OAuth (Auth.js / Supabase Auth). Role claims: `learner | coach | admin`.
- **Storage:** S3-compatible bucket for audio recordings (private, signed URLs, 90-day retention default).
- **AI provider abstraction:** one `LLMClient` interface; providers selected by env.

**Environment variables (all optional features degrade gracefully):**

```
DATABASE_URL=
AUTH_SECRET=
LLM_PROVIDER=anthropic|openai
ANTHROPIC_API_KEY=            # content generation, evaluation, conversation
OPENAI_API_KEY=               # alternative LLM provider
STT_PROVIDER=whisper|deepgram|azure
STT_API_KEY=                  # speech-to-text with word timestamps
PRONUNCIATION_PROVIDER=azure|speechace|none
PRONUNCIATION_API_KEY=        # phoneme-level pronunciation scoring
AZURE_SPEECH_REGION=
TTS_PROVIDER=elevenlabs|azure|openai|browser
TTS_API_KEY=                  # natural voices for listening & roleplay
STORAGE_BUCKET= / STORAGE_KEY= / STORAGE_SECRET=
```

**Honest-capability rule:** if `PRONUNCIATION_PROVIDER=none`, pronunciation is reported as **"Not measured"**, never estimated from text. If STT is unavailable, speaking falls back to browser Web Speech API; if that is unavailable, the task is labelled **"Typed practice — speech not scored"** and fluency/pronunciation are excluded from that day's aggregate.

### 3.1 Engine modules (separate, testable services)

| Engine | Responsibility | Nature |
|---|---|---|
| **Curriculum** | 180-day phase/week/topic framework, objectives, can-do statements. | Static data + rules |
| **Planner** | Builds each day's task list from curriculum + learner state + time budget. | Deterministic |
| **Content Generator** | Produces exercises, dialogues, prompts, roleplays at a target CEFR band. | LLM + validators |
| **Assessment** | Scores objective items; calls evaluators for open responses. | Mixed |
| **Speaking Evaluator** | Transcript + timing + pronunciation → rubric scores + errors. | LLM + audio metrics |
| **Writing Evaluator** | Rubric scores, inline corrections, model rewrite. | LLM |
| **Error Engine** | Normalises, deduplicates and clusters mistakes; tracks recurrence. | Deterministic + LLM tagging |
| **Mastery** | Per-topic, per-context mastery model. | Deterministic |
| **Spaced Repetition** | Schedules vocabulary, phrases and error re-tests. | Deterministic (SM-2 variant) |
| **Decision** | ADVANCE / PRACTICE / REPEAT / CHANGE METHOD per skill. | Deterministic |
| **Conversation / Roleplay** | Natural multi-turn dialogue with personas. | LLM |
| **Interview** | Adaptive mock interviews + scoring. | LLM + rules |
| **Progress** | Rolling skill scores, CEFR estimate, reports. | Deterministic |
| **Notification** | Daily reminder, streak-save nudges, weekly report. | Jobs |

---

## 4. DATA MODEL (minimum schema)

```text
User(id, email, role, created_at)
LearnerProfile(user_id, name, native_language, current_country, target_country,
  profession, target_profession, industry, experience_years, education, goals,
  interview_target_role, interview_target_date, daily_minutes, preferred_time,
  target_cefr, english_only_mode, start_date, timezone)
CoachLink(id, learner_id, coach_id, share_content bool, created_at, revoked_at)

SkillState(user_id, skill, score_ewma, score_last, confidence, trend_7d, updated_at)
  -- skill ∈ grammar, vocabulary, reading, listening, writing, speaking,
  --         pronunciation, fluency, professional, interview
Topic(id, phase, name, skill_tags[], cefr_band, can_do_statement)
TopicMastery(user_id, topic_id, recognition, controlled, written_use, spoken_use,
  mastery, status, attempts, last_practiced_at, method_history jsonb)

PlanDay(id, user_id, day_number, date, phase, objective, planned_topic_id,
  actual_topic_id, override_reason, status)
Task(id, plan_day_id, type, skill, topic_id, method, est_minutes, content jsonb,
  status, started_at, completed_at, completion_evidence jsonb)
Attempt(id, task_id, attempt_no, input_text, audio_url, transcript,
  metrics jsonb, scores jsonb, feedback jsonb, model_version, created_at)
DayResult(plan_day_id, overall, per_skill jsonb, minutes, mistakes, corrected,
  recurring, decisions jsonb, tomorrow jsonb)

ErrorItem(id, user_id, category, subcategory, pattern_key, original, corrected,
  explanation, skill, context, occurrences, first_seen_day, last_seen_day,
  status, next_retest_at)
  -- status ∈ new, recurring, improving, resolved
VocabItem(id, user_id, lemma, meaning, example, register, domain, cefr,
  ease, interval_days, reps, due_at, lapses, mastery)

Assessment(id, user_id, kind, day_number, sections jsonb, per_skill jsonb,
  cefr_estimate jsonb, weaknesses jsonb, created_at)
  -- kind ∈ placement, weekly, monthly, interview, final
Conversation(id, user_id, persona, mode, topic, turns jsonb, scores jsonb,
  feedback jsonb, created_at)
Achievement(user_id, code, unlocked_at)
Streak(user_id, current, longest, last_active_date, freezes_available)
ConfigThresholds(key, value, updated_by, updated_at)
PromptVersion(id, name, version, template, schema, active)
```

Retention: audio 90 days (configurable), transcripts kept. Learner can export (JSON/PDF) and delete all data.

---

## 5. FIRST-RUN EXPERIENCE

1. **Account** → magic link / Google.
2. **Profile** → name, native language, target country, profession & target profession, industry.
3. **Self-rated level** → A1 / A2 / B1 / B2 / "I don't know".
4. **Goal** → e.g. "Office job in Dubai within 6 months", interview target role/date.
5. **Time budget** → 30 / 60 / 90 / 120 minutes, preferred time, reminder opt-in.
6. **Microphone check** → record 5 s, confirm playback; if denied, explain typed fallback.
7. **Placement test** (§6) — can be paused and resumed; progress bar per section.
8. **Plan generation** → run placement → mastery seeding → planner for Week 1.
9. **"Your 180-Day Journey" screen** → estimated level (labelled *AI-estimated*), target, top-5 weaknesses, phase map, Week 1 objective, **Start Day 1** button.

---

## 6. PLACEMENT ASSESSMENT (≈45–60 min)

| Section | Format | Items | Adaptive rule |
|---|---|---|---|
| Grammar | MCQ, gap-fill, error spotting | 25–40 | Start at B1-level item; 2 correct → step up a band; 1 wrong → step down. Stop when band stabilises (3 consecutive items at same band) or 40 items. |
| Vocabulary | Meaning-in-context, collocation, register (formal/informal), phrasal verbs | 20–30 | Same staircase. Domains: everyday / workplace / professional. |
| Reading | 3 passages (A2, B1, B2) × 4 questions | 12 | Skip B2 if B1 < 50 %. |
| Listening | 3 TTS dialogues (everyday, workplace, meeting) × 4 questions; max 2 plays | 12 | Same. |
| Writing | (a) personal introduction 60–100 words, (b) professional email to a manager, (c) past work experience 100–150 words | 3 | — |
| Speaking | 6 prompts, 45–90 s each: introduce yourself, background, daily routine, previous work, difficult situation, future plans | 6 | — |

**Grammar coverage map:** present simple/continuous, past simple/continuous, present perfect, future forms, modals, articles, prepositions, countable/uncountable, comparatives, conditionals (0–2), passive, question formation, word order, subject–verb agreement.

**Speaking metrics (from STT with timestamps):** words per minute, mean length of run (words between pauses > 400 ms), pause ratio, filler rate per 100 words (`um, uh, er, like, you know, actually, basically, kind of`), self-corrections, longest coherent answer, lexical variety (MTLD), grammar error rate per 100 words, pronunciation (if provider configured).
**Forbidden:** personality, emotion, intelligence or "confidence" judgments about the person. Use the label **"Delivery indicators"** (pauses, fillers, pace) only.

**Placement output:**

```text
AI-ESTIMATED LEVEL: B1−   (not an official certificate)
Grammar A2+ · Vocabulary B1 · Reading B1 · Listening B1 · Writing A2+
Speaking A2+ · Pronunciation A2+ (or "Not measured")
Professional English A2 · Interview readiness A2
TOP 5 PRIORITIES: 1 Past simple in speech · 2 Articles · 3 Workplace vocabulary
                  4 Speaking fluency (long pauses) · 5 Email structure
```

Each priority stores evidence (the specific items/sentences that produced it) visible on tap.

### 6.1 Score → CEFR mapping (per skill, configurable)

| Score | 0–29 | 30–44 | 45–54 | 55–64 | 65–74 | 75–84 | 85–92 | 93–100 |
|---|---|---|---|---|---|---|---|---|
| Band | A1 | A2− | A2 / A2+ | B1− | B1 | B1+ / B2− | B2 | C1 |

Scores are **level-referenced** (100 = fully meets the phase's target band). Overall CEFR = median of the 7 core skills, capped at one band above the weakest productive skill (speaking or writing).

---

## 7. THE 180-DAY CURRICULUM FRAMEWORK

The calendar is a *framework*; the planner may insert, repeat or reorder topics (§11).

| Phase | Days | Theme | Target band | Language mode | Core outcomes (can-do) |
|---|---|---|---|---|---|
| 1 | 1–30 | Foundation | A2+ → B1− | English + native-language support on demand | Talk about self, routine, past and plans with accurate basic tenses; handle shops, transport, appointments. |
| 2 | 31–60 | Fluency & Conversation | B1 | Mostly English | Sustain a 5-minute conversation; give opinions with reasons; agree/disagree politely; small talk. |
| 3 | 61–90 | Workplace English | B1 → B1+ | English by default | Handle office conversations, phone calls, requests, updates, clarification; Work Mode register shifting. |
| 4 | 91–120 | Professional Communication | B1+ | English-only default | Write clear emails and reports (SFARN: Situation, Facts, Action, Result, Next step); run a short meeting update. |
| 5 | 121–150 | Career & Interview | B1+ → B2− | English-only | Deliver STAR answers; handle behavioural and role-specific questions; 3-minute presentations. |
| 6 | 151–180 | Real-World Simulation | B2− → B2 | English-only | Handle complaints, disagreements, mistakes, salary and availability discussions; pass full simulation. |

**Topic banks** (each topic has: objective, can-do statement, target grammar, target vocabulary set of 12–20 items, model dialogue, speaking prompt, writing prompt):
- **P1:** introductions, family, routine, home, shopping, restaurants, transport, directions, appointments, questions, past experiences, future plans, describing people/places, opinions.
- **P2:** opinions & reasons, experiences, travel, problems, preferences, social conversation, small talk, explaining situations, agreeing/disagreeing.
- **P3:** workplace vocabulary, office talk, meetings, telephone, requests, follow-ups, updates, clarification, explaining problems, offering solutions, talking to managers/colleagues/customers.
- **P4:** email anatomy (greeting, opening, purpose, request, attachments, follow-up, apology, update, closing), daily/weekly/incident reports, meeting summaries, progress updates.
- **P5:** tell me about yourself, strengths/growth areas, why this role, STAR behavioural stories (conflict, mistake, problem solved, success), role-specific questions, questions to ask the interviewer.
- **P6:** first day, HR, manager 1:1, asking for help, presenting, disagreement, explaining mistakes, requesting leave, customer complaint, delay, unhappy customer, clarifying requirements, salary, availability, career goals.

**Weekly rhythm:** Days 1–6 of each week = lessons; Day 7 = **Weekly Review** (§14). Day 30/60/90/120/150 = **Monthly Assessment**. Day 180 = **Final Assessment** (§16).

---

## 8. DAILY SESSION DESIGN

### 8.1 Time budget allocation

| Block | 30 min | 60 min | 90 min | 120 min |
|---|---|---|---|---|
| Warm-up review (SRS + error re-tests) | 5 | 8 | 10 | 12 |
| Core lesson (grammar/vocab in context) | 8 | 12 | 15 | 20 |
| Listening | — | 10 | 15 | 20 |
| Speaking (guided) | 8 | 12 | 15 | 20 |
| Writing | 5 | 8 | 15 | 20 |
| Conversation / roleplay | 4 | 10 | 20 | 28 |

Weakness boost: the weakest skill (lowest EWMA, §10) receives **+25 %** time taken proportionally from the strongest two skills. Minimum 1 speaking task every day regardless of budget.

### 8.2 Exercise catalogue

- **Grammar:** MCQ, gap-fill, sentence correction, sentence building (drag tokens), error identification, transformation (active→passive, informal→formal).
- **Vocabulary:** flashcards (SRS), meaning-in-context, collocation match, synonym/register choice, use-it-in-a-sentence (AI-checked).
- **Listening:** TTS dialogues at controlled speed (0.85×–1.1×), gist + detail questions, dictation (word-level diff), key-phrase spotting.
- **Speaking:** read-aloud, repeat-after-me, answer question, describe situation, roleplay turn, free conversation, timed presentation.
- **Writing:** message, email, report, summary, description, professional reply, interview answer.

### 8.3 Completion evidence (a task is complete only when)

| Task | Evidence required |
|---|---|
| Objective items | All items answered |
| Speaking | Audio ≥ 15 s (or ≥ 25 words transcribed) and evaluation returned |
| Writing | Text ≥ 70 % of minimum word count, evaluated, **and** one rewrite submitted when first score < 85 |
| Listening | All questions answered after ≥ 1 play |
| Conversation | ≥ 6 learner turns and ≥ 60 learner words |

### 8.4 Mandatory feedback loop (writing, speaking, interview)
1. Scores per rubric dimension.
2. What worked (max 3, specific, quoted evidence).
3. What to fix (max 3, prioritised).
4. Corrected sentences side-by-side (original → better → why).
5. **Retry required** if score < 85 on the day's target skill. The second attempt is scored and the **delta** is shown ("+12 on structure").
6. Errors saved to the Error Bank automatically.

---

## 9. EVALUATION RUBRICS

### 9.1 Speaking (0–100 each)
Grammar accuracy · Vocabulary range & precision · Fluency (derived from WPM, run length, pause ratio) · Pronunciation (provider or "Not measured") · Coherence & structure · Naturalness · Professional register (Phase 3+) · Task achievement.
**Fillers** are a *coaching metric*: shown as "4.2 fillers / 100 words (target < 4)". Fluency deduction for fillers is capped at 10 points.

### 9.2 Writing (0–100 each)
Grammar · Vocabulary · Spelling & punctuation · Clarity · Structure/organisation · Tone & register · Professionalism (P3+) · Conciseness · Task achievement.

### 9.3 Interview (0–100 each)
Answer relevance · Structure (STAR where applicable) · Specificity/evidence · Grammar · Vocabulary · Fluency · Professionalism · Delivery indicators.
Also output: strong answers, weak answers, answers to rewrite, questions to re-ask later.

### 9.4 Calibration requirements
- Every rubric dimension has **band descriptors** (what 40 / 60 / 80 / 95 look like) embedded in the evaluator prompt.
- Evaluator returns `evidence[]` for every score below 70.
- **Anchor set:** 30 human-graded sample responses stored in `/eval/anchors`; CI runs the evaluator against them; mean absolute error must be ≤ 8 points per dimension.
- Same input evaluated twice must differ by ≤ 5 points (temperature ≤ 0.2 for evaluation).

---

## 10. SCORING MODEL

**Task score** = weighted mean of its rubric dimensions (weights in config).
**Day score per skill** = mean of that skill's task scores that day.
**Day overall** = weighted mean across skills practised: Speaking 0.22, Writing 0.16, Grammar 0.14, Vocabulary 0.14, Listening 0.14, Pronunciation 0.10, Professional 0.10 (renormalised over skills actually practised/measured).

**Skill state (long-term):** exponentially weighted moving average
`EWMA_new = 0.3 × day_score + 0.7 × EWMA_old` (α configurable).
Confidence grows with sample count; skills with < 3 samples display "Estimating…".

**Knowledge vs application (critical):** grammar topics are tracked in four contexts — `recognition` (MCQ), `controlled` (gap-fill/transformation), `written_use` (errors in free writing), `spoken_use` (errors in speech). A learner at 90 % recognition and 55 % spoken use is shown **"Knows it — not yet using it in speech."**

---

## 11. LEARNING DECISION ENGINE (the heart of the product)

Runs after every task and at end of day. Evaluates **each skill and topic independently**.

**Default thresholds (configurable per learner/admin):**

| Score | Decision | Consequence |
|---|---|---|
| 85–100 | 🟢 **ADVANCE** | Move to next topic; raise difficulty one step. |
| 70–84 | 🟡 **PRACTICE MORE** | Continue, plus a 5–10 min targeted review tomorrow. |
| 55–69 | 🟠 **REPEAT** | Re-teach the same objective tomorrow with *new* exercises. |
| < 55 | 🔵 **CHANGE METHOD** | Re-teach using a different modality. |

**Override rules (evaluated in order):**
1. **Consecutive-failure rule:** same topic < 70 on 3 sessions using the same method → force CHANGE METHOD (method rotation: `drill → contextual reading → guided speaking → conversation roleplay → writing with model → explicit explanation in native language`). Never repeat an identical exercise; content generator must receive `exclude_item_ids`.
2. **Skill-floor rule:** if overall ≥ 70 but any skill < 60 → advance the curriculum topic **and** insert a recovery block for that skill (≥ 20 % of tomorrow).
3. **Recurring-error rule:** any `ErrorItem` with occurrences ≥ 3 in the last 7 days → micro-drill (3–5 items) in tomorrow's warm-up.
4. **Plan-override rule:** if a skill EWMA drops ≥ 10 points in 5 days or falls < 55, replace tomorrow's planned topic with a **Recovery Session** and push the planned topic by one day (log `override_reason`).
5. **Anti-frustration rule:** max 2 REPEAT decisions on the same topic, then CHANGE METHOD then allow ADVANCE with the topic flagged `revisit_in = 7 days`.
6. **Difficulty adaptation:** 3 consecutive items correct → +1 difficulty step; 2 consecutive wrong → −1 step. Steps change vocabulary band, sentence length, dialogue speed and number of turns. Never communicate this as a penalty.

**Output shown to learner:**

```text
RESULT: PRACTICE MORE — 72/100
Grammar 84 🟢 · Speaking 61 🟠 · Writing 78 🟡
Why: past simple is accurate in writing (88) but not in speech (58).
Tomorrow: 10-min past-simple speaking drill → new lesson "Giving updates".
```

---

## 12. MASTERY ENGINE

`mastery = 0.15·recognition + 0.20·controlled + 0.30·written_use + 0.35·spoken_use` (each on a 0–100 rolling window of last 5 observations).

| Status | Rule |
|---|---|
| Not started | no observations |
| Learning | < 40 |
| Developing | 40–59 |
| Practicing | 60–74 |
| Almost mastered | 75–84 **or** ≥ 85 without spoken evidence |
| Mastered | ≥ 85 **and** evidence in ≥ 3 contexts **and** ≥ 2 separate days **and** retained on a delayed re-test ≥ 7 days later |

A mastered topic re-enters review at 30 days; failure demotes it to *Practicing*.

---

## 13. ERROR BANK AND SPACED REPETITION

**Error normalisation:** evaluator returns `{category, subcategory, pattern_key, original, corrected, explanation}`; `pattern_key` is a canonical form (e.g. `be+agree`, `have+past_simple`, `missing_article_before_singular_countable`) so "I am agree" and "She is agree" count as one pattern.

**Status transitions:** `new` → `recurring` (≥ 3 occurrences) → `improving` (2 correct re-tests) → `resolved` (4 correct re-tests over ≥ 14 days, no new occurrences). Recurrence re-opens it.

**Reuse:** errors appear as sentence-correction items, as target structures in speaking prompts, and as "watch for" hints in conversations.

**Spaced repetition (SM-2 variant)** for vocabulary, phrases and error re-tests:
intervals `1 → 2 → 4 → 7 → 14 → 30 → 60` days; quality 0–5; `ease` ∈ [1.3, 2.8]; a lapse resets to interval 1 and reduces ease by 0.2. Daily review cap = 20 % of the time budget; overflow rolls forward (never a guilt backlog).

---

## 14. ASSESSMENTS AND REPORTS

**Weekly Review (every 7th day, 25–40 min):** grammar, vocabulary, listening, speaking, writing, professional task. Report: overall vs last week (delta), strongest, weakest, most improved, most common error pattern, next week's two priorities.

**Monthly Assessment (Days 30/60/90/120/150, 45–60 min):** mini-placement at the phase's target band. Report compares Day 0 → previous month → now with line charts and radar chart; updates the CEFR estimate; rewrites the next month's emphasis.

**CEFR tracker:** always labelled **"AI-estimated CEFR level — not an official certificate."** Progress bar within band. Level changes only when the monthly assessment *and* the 14-day EWMA both support it.

---

## 15. SPECIALIST MODULES

### 15.1 AI Conversation Partner (from Day 31; lighter version from Day 1)
- Personas: friend, colleague, neighbour, stranger, manager, HR, customer, receptionist, supplier, client, interviewer.
- Behaves naturally: reacts to content, asks follow-ups, shares brief opinions, does **not** interrogate.
- **Live correction policy:** no interruptions during the dialogue; optional subtle "recast" (repeats the learner's idea correctly in its reply). Full feedback after the conversation.
- Grades its own language to the learner's band (sentence length, vocabulary list), enforced by a post-generation check.

### 15.2 Work Mode (from Day 61)
Toggle that switches all personas to professional register. Includes a **Register Transformer** drill: informal → professional → polished, with guidance on when each is appropriate (e.g. "Send me the file" → "Could you please send me the file?" → "Could you share the updated file when you have a moment?"). Avoid stiff, over-formal corporate English; favour clear, natural professional English.

### 15.3 Email & Report Trainer (from Day 91)
Scenario library (monthly report request, delay apology, follow-up with no reply, meeting request, clarification, complaint response). Report writing uses **SFARN** structure. Writing loop per §8.4.

### 15.4 Presentation Trainer (from Day 121)
2–10 minute talks with a timer and outline scaffold (opening, three points, close). Scores structure, intro, conclusion, fluency, grammar, vocabulary, pronunciation, professionalism. Mandatory second delivery with delta.

### 15.5 Interview Simulator (from Day 121; available earlier as "practice")
Setup: job title (Administrative Assistant, Receptionist, Customer Service, Sales Executive/Manager, Account Manager, HR Assistant, Marketing Assistant, Accountant, Project Coordinator, Office Manager, custom), industry, seniority, company type, difficulty (friendly / standard / tough), length (10/20/30 min), market context (default: UAE).
- Questions not revealed in advance; mix of general, behavioural (STAR), role-specific, and one curveball; follow-up questions based on answers.
- Scored per §9.3; weak questions enter an "Interview Retry" queue that feeds future speaking tasks.
- **Interview Readiness** trend: first vs latest vs best.

### 15.6 Roleplay Engine
Scenario = persona + goal + hidden complication (e.g. "the report you sent has a wrong figure"). Complications are introduced mid-dialogue ≥ 30 % of the time.

### 15.7 English-only progression
Days 1–30 native-language help visible; 31–60 collapsed; 61–90 behind a tap; 91–180 English-only with an **"Explain in my language"** emergency button that explains once and returns to English. Usage is tracked (not penalised).

---

## 16. DAY 180 — FINAL ASSESSMENT

1. Full placement re-run (same structure, parallel forms).
2. 20–30 minute full job interview.
3. Workplace simulation chain: introduction → email → meeting update → customer problem → manager conversation → short report → 3-minute presentation.
4. **Final Professional English Report:** AI-estimated CEFR, per-skill Day 0 vs Day 180, strongest skills, remaining weaknesses with evidence, interview readiness, workplace readiness, recommended next plan.
5. **Integrity rule:** report only levels supported by the assessment evidence; never inflate.

**After Day 180** the learner chooses: Maintenance (30 min/day), Professional Mastery (60–90 min), Interview Sprint (job-search focus), Advanced (B2 → C1).

---

## 17. MOTIVATION, STREAKS AND COACH VIEW

- **Streak:** a day counts when ≥ 70 % of planned tasks have completion evidence. 1 freeze per 7 days earned automatically. Missed days → *"Welcome back — let's continue where you stopped."* No double workload, no guilt copy.
- **Stats:** current/longest streak, days completed, minutes, speaking minutes, writing tasks, conversations, interviews, words learned.
- **Achievements (meaningful, not childish):** First Conversation, 7/30/90-day streak, First Professional Email, First Mock Interview, 100 Speaking Minutes, 500 / 1,000 Words, B1 Estimated, B2 Estimated, Interview Score ≥ 80, 180 Days Completed.
- **Coach dashboard:** days completed, level, streak, weekly and monthly scores, speaking/writing scores, top weaknesses, recent improvement, current focus. Private content hidden unless shared. Learner sees who has access and can revoke.

---

## 18. AI TEACHER PERSONA AND CONTENT QUALITY

**Voice:** patient, direct, honest, professional, warm but not gushing; never childish; no exclamation-mark praise inflation.
- Mistakes: *"You're close. A more natural way to say this is…"* — never "Wrong!".
- Poor performance: *"Your answer was understandable, but it needs work before we move to a harder version."*
- Praise must cite evidence ("Your email had a clear purpose in the first line").

**Content guardrails (automated checks before any generated item reaches the learner):**
1. Schema validation.
2. Level check: ≥ 95 % of tokens within the target CEFR word list + topic vocabulary.
3. Answer-key self-consistency: a second model pass solves the item blind; mismatch → discard.
4. Grammar-explanation check against a curated rule library for the 40 core structures.
5. Repetition check: cosine similarity to last 30 days of items < 0.9.
6. Cultural/workplace realism check for UAE context when target country = UAE (e.g. Sunday–Thursday or Monday–Friday weeks are both valid; avoid stereotypes).

---

## 19. AI CONTRACTS (structured I/O)

All prompts are versioned in `PromptVersion`. Examples of required output schemas:

```json
// WritingEvaluation
{
  "scores": {"grammar": 0, "vocabulary": 0, "spelling": 0, "clarity": 0,
             "structure": 0, "tone": 0, "professionalism": 0, "task": 0},
  "overall": 0,
  "strengths": [{"point": "", "evidence": ""}],
  "improvements": [{"point": "", "priority": 1}],
  "corrections": [{"original": "", "corrected": "", "explanation": "",
                   "category": "", "pattern_key": ""}],
  "model_answer": "",
  "retry_instruction": ""
}
```

```json
// SpeakingEvaluation (transcript + metrics in, this out)
{
  "scores": {"grammar":0,"vocabulary":0,"fluency":0,"pronunciation":null,
             "coherence":0,"naturalness":0,"professional":0,"task":0},
  "delivery": {"wpm":0,"filler_per_100":0,"pause_ratio":0,"longest_run":0},
  "errors": [{"original":"","corrected":"","explanation":"","category":"","pattern_key":""}],
  "strengths": [], "improvements": [], "better_version": ""
}
```

```json
// GeneratedExercise
{"type":"gap_fill","cefr":"B1","topic_id":"","target_structure":"",
 "items":[{"id":"","prompt":"","options":[],"answer":"","explanation":""}]}
```

---

## 20. UX AND DESIGN

- **Feel:** premium, calm, professional (think Linear / Notion clarity), not a children's game. Large tap targets (≥ 44 px), excellent mobile, dark/light themes, WCAG 2.2 AA.
- **Home screen (above the fold):** Day X/180, streak, AI-estimated level → target, today's objective, main weakness, today's task list with time estimates and ✓/○ states, one primary **Start** / **Continue** button.
- **Session screen:** one task at a time, progress rail, timer, "Explain in my language" (phase-gated), exit-and-resume.
- **Progress screen:** skill lines (overall, speaking, listening, reading, writing, grammar, vocabulary, pronunciation, professional, interview), radar chart Day 0 vs now, mastery grid by topic, error-bank trends.
- **Error Bank screen:** filter by status/skill, "Practice these now" button.
- **Offline:** cached next-day content for objective exercises; sync on reconnect.

---

## 21. DELIVERY MILESTONES (each must be fully working)

| Milestone | Scope | Exit criteria |
|---|---|---|
| **M1 — Core loop** | Auth, profile, onboarding, placement (grammar, vocab, writing, speaking), plan day, dashboard, grammar, vocabulary+SRS, writing loop, speaking (STT), daily score, decision engine, error bank, progress | A new user can onboard, place, complete Day 1–7, see decisions change Day 8. |
| **M2 — Communication** | Listening (TTS), conversation partner, Work Mode, register transformer, email & report trainer, roleplay, weekly review | Weekly report generated from real data. |
| **M3 — Career** | Interview simulator, presentation trainer, monthly assessment, analytics, coach dashboard, achievements | Coach sees summary without private content. |
| **M4 — Completion** | Final assessment, final report, post-180 modes, admin config & content QA, exports | Full 180-day simulated run passes (§22). |

---

## 22. ACCEPTANCE TESTS (must pass)

1. **Adaptive proof:** simulated learner fails past simple in speech on Days 10–12 → Day 13 contains a CHANGE METHOD past-simple activity in a new modality.
2. **Skill-floor:** overall 82 with speaking 55 → next day advances topic **and** includes ≥ 20 % speaking recovery.
3. **Error reuse:** an error logged on Day 12 reappears as an exercise within its SRS interval.
4. **No false completion:** opening a task without submitting never marks it complete.
5. **No inflation:** placement scores re-computed from stored attempts reproduce identical results.
6. **Missed days:** skipping 3 days produces one normal-size day, not a backlog.
7. **Honest capability:** with no pronunciation key, pronunciation shows "Not measured" everywhere.
8. **Privacy:** coach API returns 403 for conversation/writing content without `share_content`.
9. **Evaluator calibration:** anchor-set MAE ≤ 8 per dimension.
10. **180-day simulation:** a scripted run through all 180 days completes without errors and produces all weekly, monthly and final reports.

---

## 23. SUCCESS METRICS (product analytics)

D1/D7/D30 retention, % days completed, median minutes/day, speaking minutes/week, retry rate and retry improvement delta, recurring-error resolution rate, monthly skill gains, interview readiness change, NPS. Target: ≥ 60 % of active learners show +1 AI-estimated sub-band per 60 days.

---

## 24. NON-GOALS

No official CEFR/IELTS certification claims. No psychological or emotional analysis from voice. No public social feed. No gamified cartoon mascots. No generic "Amazing!" feedback.

---

**Begin now:** inspect the environment, state the architecture, then implement Milestone 1 completely before moving on.
