import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { generateHeadToHead, generateCompareAdvice, generateCompareRoast } from "@/lib/ai"
import { github } from "@/lib/github"

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { usernameA, usernameB, type } = await req.json() as {
    usernameA: string
    usernameB: string
    type: "head2head" | "advice" | "roast"
  }

  if (!["head2head", "advice", "roast"].includes(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 })
  }

  try {
    const [ghUserA, ghUserB, ghReposA, ghReposB] = await Promise.all([
      github.getUser(usernameA),
      github.getUser(usernameB),
      github.getRepos(usernameA),
      github.getRepos(usernameB),
    ])

    function buildProfile(
      u: typeof ghUserA,
      repos: typeof ghReposA,
    ) {
      const langMap: Record<string, number> = {}
      for (const r of repos) {
        if (r.language && !r.fork) langMap[r.language] = (langMap[r.language] ?? 0) + 1
      }
      const topLanguages = Object.entries(langMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([l]) => l)

      const topRepos = repos
        .filter((r) => !r.fork)
        .sort((a, b) => b.stargazers_count - a.stargazers_count)
        .slice(0, 6)
        .map((r) => ({
          name: r.name,
          stars: r.stargazers_count,
          description: r.description,
          language: r.language,
        }))

      const totalStars = repos
        .filter((r) => !r.fork)
        .reduce((s, r) => s + r.stargazers_count, 0)

      return {
        name: u.name,
        username: u.login,
        bio: u.bio,
        followers: u.followers,
        following: u.following,
        publicRepos: u.public_repos,
        topLanguages,
        topRepos,
        totalStars,
      }
    }

    const profileA = buildProfile(ghUserA, ghReposA)
    const profileB = buildProfile(ghUserB, ghReposB)

    const model = "llama-3.3-70b-versatile"
    let content = ""

    if (type === "head2head") {
      content = await generateHeadToHead(profileA, profileB)
    } else if (type === "advice") {
      content = await generateCompareAdvice(profileA, profileB)
    } else {
      content = await generateCompareRoast(profileA, profileB)
    }

    return NextResponse.json({ content, model })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
