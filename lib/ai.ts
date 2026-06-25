import Groq from "groq-sdk"

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! })
const MODEL = "llama-3.3-70b-versatile"

type RepoInput = { name: string; stars: number; description: string | null; language: string | null }

interface ProfileInput {
  name: string | null
  username: string
  bio: string | null
  followers: number
  following: number
  publicRepos: number
  topLanguages: string[]
  topRepos: RepoInput[]
  totalStars: number
}

export async function generateSummary(profile: ProfileInput): Promise<string> {
  const repoRows = profile.topRepos.slice(0, 6)
    .map(r => `| \`${r.name}\` | ${r.language ?? "—"} | ${r.stars.toLocaleString()} |`)
    .join("\n")

  const prompt = `Write a GitHub developer profile analysis. Be direct and specific. No fluff, no vague praise, no formal language. Write like a senior dev explaining something to a coworker.

Developer: ${profile.name ?? profile.username} (@${profile.username})
Bio: ${profile.bio ?? "(none)"}
${profile.followers} followers · ${profile.publicRepos} repos · ${profile.totalStars} total stars
Languages: ${profile.topLanguages.join(", ")}

Top repos:
| Repository | Language | Stars |
|------------|----------|-------|
${repoRows}

Structure:
- 2 short paragraphs: what this dev builds, and what their GitHub pattern says about how they work
- Then the repo table (formatted cleanly)

Rules:
- Reference their actual repo names and languages
- No "it seems", "one might", "it is worth noting", no British vocabulary
- Plain conversational English
- No generic lines like "passionate developer" or "strong foundation"

Example of what I want:

---
@avelino is primarily a Go developer. The \`awesome-go\` list is the obvious star here, but the surrounding repos show someone who actually codes in Go daily — there are small focused utilities that clearly came from real problems, not tutorial exercises.

The pattern is breadth over depth. Lots of repos, most of them small and purposeful. The star-to-follower ratio is high, which usually means the work is useful but the person isn't playing the social media game. That's a good sign.

| Repository | Language | Stars |
|------------|----------|-------|
| \`awesome-go\` | Go | 140,000 |
| \`vim-bootstrap\` | JavaScript | 5,200 |
---

Now write for @${profile.username}.`

  const res = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    max_tokens: 500,
    temperature: 0.6,
  })
  return res.choices[0]?.message?.content?.trim() ?? ""
}

export async function generateRoast(profile: {
  username: string
  bio: string | null
  followers: number
  publicRepos: number
  topLanguages: string[]
  totalStars: number
}): Promise<string> {
  const prompt = `You are a dry, sharp British senior engineer. Roast this developer's GitHub profile.

@${profile.username}
Bio: "${profile.bio ?? "(no bio)"}"
${profile.followers} followers · ${profile.publicRepos} repos · ${profile.totalStars} stars
Languages: ${profile.topLanguages.join(", ")}

Part 1 — The British Roast:
Write 3–4 sentences of dry, cutting British wit. Reference their actual stats, language choices, and bio specifically. No generic jokes.

Then write exactly this line as a header:
---
**Didn't quite follow that? Here's the version for someone who needs the subtlety beaten out of it:**

Part 2 — The Blunt Version:
Write the same roast again but in the most direct, zero-finesse language possible. State the exact same points but strip out all the wit — just say it plainly and rudely, like you've completely given up on being clever.

Example output:

---
One suspects that @devguy discovered ${profile.topLanguages[0] ?? "JavaScript"} at an impressionable age and has since made it his life's work to avoid confronting anything more demanding. The ${profile.publicRepos} repositories imply productivity; the ${profile.totalStars} stars imply that the output has been received with the enthusiasm typically reserved for a dentist's waiting room. The bio — "${profile.bio ?? "absent, like the self-awareness"}" — reads as though it was composed in a hurry and never revisited, which, on reflection, may be the most accurate thing about the whole profile.

---
**Didn't quite follow that? Here's the version for someone who needs the subtlety beaten out of it:**

You've been coding in ${profile.topLanguages[0] ?? "JavaScript"} for years and you've got nothing to show for it. ${profile.publicRepos} repos. ${profile.totalStars} total stars. That means basically nobody uses your stuff. Your bio is lazy and says nothing about you. You're not impressive.

---

Now write the roast for @${profile.username}. Make both parts specific to their actual data.`

  const res = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    max_tokens: 450,
    temperature: 0.92,
  })
  return res.choices[0]?.message?.content?.trim() ?? ""
}

export async function generateAdvice(profile: {
  username: string
  topLanguages: string[]
  topRepos: RepoInput[]
  publicRepos: number
  followers: number
  totalStars: number
}): Promise<string> {
  const repoRows = profile.topRepos.slice(0, 6)
    .map(r => `| \`${r.name}\` | ${r.language ?? "?"} | ${r.stars} |`)
    .join("\n")

  const prompt = `Give specific, practical career and engineering advice for this developer. Be direct. No motivational language, no vague tips.

@${profile.username} · ${profile.publicRepos} repos · ${profile.followers} followers · ${profile.totalStars} stars
Languages: ${profile.topLanguages.join(", ")}

| Repository | Language | Stars |
|------------|----------|-------|
${repoRows}

Structure:
1. One paragraph: what they're doing well — name specific repos and why
2. One paragraph: the most important thing to fix or improve — tie it to what you actually see
3. A table with 3 next steps: Action | Why It Matters | Priority (High/Medium/Low)

Rules:
- No "it's worth noting", "one might consider", "it's clear that"
- Reference the actual repos and languages
- Plain, direct English — like advice from a senior dev in a 1:1

Example:

---
The TypeScript work in \`api-gateway\` is solid. The module boundaries are clear and you can tell it's been through some production pain — that's exactly the kind of experience that matters. \`auth-lib\` having test coverage when most solo projects don't is a good signal.

The READMEs are thin across the board. That's the biggest thing holding this work back. \`api-gateway\` looks like something people would actually use, but someone landing on it from a search has no idea what it does in 10 seconds. Fix that first.

| Action | Why It Matters | Priority |
|--------|----------------|----------|
| Rewrite the README for \`api-gateway\` | It's the first thing anyone sees; bad docs kill adoption | High |
| Write one technical post about your auth approach | Devs search for this stuff; it builds rep fast | High |
| Open a PR to a popular TypeScript library | Gets your name in front of maintainers | Medium |
---

Now write advice for @${profile.username}.`

  const res = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    max_tokens: 550,
    temperature: 0.55,
  })
  return res.choices[0]?.message?.content?.trim() ?? ""
}

export async function generateHeadToHead(
  a: ProfileInput,
  b: ProfileInput
): Promise<string> {
  const repoRowsA = a.topRepos.slice(0, 5)
    .map(r => `| \`${r.name}\` | ${r.language ?? "—"} | ${r.stars.toLocaleString()} |`)
    .join("\n")
  const repoRowsB = b.topRepos.slice(0, 5)
    .map(r => `| \`${r.name}\` | ${r.language ?? "—"} | ${r.stars.toLocaleString()} |`)
    .join("\n")

  const prompt = `Write a head-to-head comparison of two GitHub developers. Be direct and specific. No fluff, no vague praise, no formal language. Write like a senior dev comparing two peers.

Developer A: ${a.name ?? a.username} (@${a.username})
Bio: ${a.bio ?? "(none)"}
${a.followers} followers · ${a.publicRepos} repos · ${a.totalStars.toLocaleString()} total stars
Languages: ${a.topLanguages.join(", ")}

Top repos for A:
| Repository | Language | Stars |
|------------|----------|-------|
${repoRowsA}

Developer B: ${b.name ?? b.username} (@${b.username})
Bio: ${b.bio ?? "(none)"}
${b.followers} followers · ${b.publicRepos} repos · ${b.totalStars.toLocaleString()} total stars
Languages: ${b.topLanguages.join(", ")}

Top repos for B:
| Repository | Language | Stars |
|------------|----------|-------|
${repoRowsB}

Structure:
1. Opening: who each developer is and their primary focus area
2. Direct comparison across: reach (followers), output (repos), impact (stars), language breadth — reference specific numbers
3. Who has the edge in each dimension and why
4. Final verdict in one sentence

Rules:
- Reference actual repo names, languages, and numbers
- Every sentence should relate one developer to the other — this is a comparison
- No "it seems", "one might", "it is worth noting"
- Plain conversational English
- No generic lines like "both talented developers"

Example:

---
@avelino is a Go infrastructure builder — \`awesome-go\` is the obvious anchor, but the surrounding repos show someone solving real systems problems. @gaearon works in the React ecosystem, building tools that other developers use daily.

On reach, @gaearon leads with 50k+ followers — frontend work has a wider audience. But @avelino has higher impact per repo: \`awesome-go\` alone at 140k stars dwarfs most portfolios. @avelino spreads across more languages (Go, JavaScript, Python) while @gaearon is deeply specialized in TypeScript/JavaScript.

The edge goes to @gaearon for community influence, but @avelino has more technical range.

Verdict: @gaearon moves the conversation; @avelino moves the code.
---

Now write the head-to-head for @${a.username} vs @${b.username}.`

  const res = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    max_tokens: 550,
    temperature: 0.6,
  })
  return res.choices[0]?.message?.content?.trim() ?? ""
}

export async function generateCompareAdvice(
  a: ProfileInput,
  b: ProfileInput
): Promise<string> {
  const repoRowsA = a.topRepos.slice(0, 5)
    .map(r => `| \`${r.name}\` | ${r.language ?? "?"} | ${r.stars} |`)
    .join("\n")
  const repoRowsB = b.topRepos.slice(0, 5)
    .map(r => `| \`${r.name}\` | ${r.language ?? "?"} | ${r.stars} |`)
    .join("\n")

  const prompt = `Give specific, practical career and engineering advice comparing two developers. Be direct. No motivational language, no vague tips.

@${a.username} · ${a.publicRepos} repos · ${a.followers} followers · ${a.totalStars.toLocaleString()} stars
Languages: ${a.topLanguages.join(", ")}

| Repository | Language | Stars |
|------------|----------|-------|
${repoRowsA}

@${b.username} · ${b.publicRepos} repos · ${b.followers} followers · ${b.totalStars.toLocaleString()} stars
Languages: ${b.topLanguages.join(", ")}

| Repository | Language | Stars |
|------------|----------|-------|
${repoRowsB}

Structure:
1. One paragraph per developer: what they're doing well — name specific repos and why
2. One paragraph per developer: the most important thing to fix or improve
3. One paragraph: what each could learn from the other — specific cross-pollination ideas
4. A table with 3 next steps for each developer: Developer | Action | Why It Matters | Priority (High/Medium/Low)

Rules:
- Reference actual repos, languages, and numbers
- The "learn from each other" section must be concrete — name specific skills or approaches
- No "it's worth noting", "one might consider", "it's clear that"
- Plain, direct English — like advice from a senior dev in a 1:1

Example:

---
@userA's Go work in \`api-gateway\` is solid — it's clearly been through production pain. The test coverage stands out. @userB's React component library shows good API design instincts; the composition patterns are thoughtful.

@userA needs better documentation across the board — great code nobody can use. @userB should invest in a proper build pipeline; the manual release process is fragile.

@userA could learn component design patterns from @userB's clean API surfaces. @userB could learn systems thinking from @userA's production debugging approach.

| Developer | Action | Why It Matters | Priority |
|-----------|--------|----------------|----------|
| @userA | Rewrite README for \`api-gateway\` | First impression kills adoption | High |
| @userA | Write about the auth architecture | Builds reputation in Go ecosystem | Medium |
| @userB | Add CI/CD to component library | Automates fragile release process | High |
| @userB | Study @userA's error handling patterns | Improves reliability in production | Medium |
---

Now write advice for @${a.username} and @${b.username}.`

  const res = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    max_tokens: 600,
    temperature: 0.55,
  })
  return res.choices[0]?.message?.content?.trim() ?? ""
}

export async function generateCompareRoast(
  a: ProfileInput,
  b: ProfileInput
): Promise<string> {
  const prompt = `You are a dry, sharp British senior engineer. Roast these two developers by comparing them against each other.

Developer A: @${a.username}
Bio: "${a.bio ?? "(no bio)"}"
${a.followers} followers · ${a.publicRepos} repos · ${a.totalStars.toLocaleString()} stars
Languages: ${a.topLanguages.join(", ")}

Developer B: @${b.username}
Bio: "${b.bio ?? "(no bio)"}"
${b.followers} followers · ${b.publicRepos} repos · ${b.totalStars.toLocaleString()} stars
Languages: ${b.topLanguages.join(", ")}

Part 1 — The British Roast:
Write 4-5 sentences of dry, cutting British wit that compares them directly. Reference their actual stats, language choices, and bios. Contrast them against each other — one may come out worse, or they may be equally unimpressive in different ways. No generic jokes.

Then write exactly this line as a header:
---
**Didn't quite follow that? Here's the version for someone who needs the subtlety beaten out of it:**

Part 2 — The Blunt Version:
Write the same roast again but in the most direct, zero-finesse language possible. State plainly who is worse and why, or how they're both failing in different ways. Strip out all the wit.

Example output:

---
@${a.username} has clearly invested heavily in ${a.topLanguages[0] ?? "JavaScript"}, which is a bit like being the most enthusiastic passenger on a sinking ship. @${b.username}, meanwhile, has ${b.publicRepos} repos and ${b.totalStars.toLocaleString()} stars between them, suggesting a volume-over-quality approach that hasn't quite paid off. ${a.followers > b.followers ? `${a.username} has the followers but ${b.username} has the volume — neither has the impact.` : `${b.username} has the followers but ${a.username} has the repos — quantity and popularity, neither translating to quality.`} The bios read like they were generated by someone who'd never met either of them.

---
**Didn't quite follow that? Here's the version for someone who needs the subtlety beaten out of it:**

${a.username}, you've been grinding in ${a.topLanguages[0] ?? "JavaScript"} and have almost nothing to show for it. ${b.username}, you've got tons of repos and barely any stars — nobody uses your stuff. ${a.followers > b.followers ? `${a.username} is more popular but still not impressive. ${b.username} is just noise.` : `${b.username} is more popular but still mediocre. ${a.username} is just noise.`} Both of your bios are garbage.
---

Now write the roast for @${a.username} vs @${b.username}. Make both parts specific to their actual data and stats.`

  const res = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    max_tokens: 500,
    temperature: 0.92,
  })
  return res.choices[0]?.message?.content?.trim() ?? ""
}
