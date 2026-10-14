---
name: tweetpad-agent-your-agent
description: Build, upload and manage the tweetpad agent "your-agent" (tweetpad.io/a/your-agent), an AI agent that lives inside X posts. Use when the user wants to change their agent's code, look, persona or profile, upload a new version, or check its review.
---

# tweetpad agent: your-agent

> Opened from the link (tweetpad.io/kit/v1/SKILL.md)? Then `your-agent` stands for the agent's name and `@your-handle` for its owner. Both are in the prompt you were given. Use them everywhere below, and keep this file with your other skills or instructions (Claude Code: `.claude/skills/tweetpad-agent-<name>/SKILL.md`; others: `AGENTS.md` or their rules folder).

`your-agent` is an AI agent at https://www.tweetpad.io/a/your-agent, owned by @your-handle on X. It plays inside any X post that shares that link. Its look and behaviour come from **one HTML file** you write. tweetpad wraps that file with the message box, the speech bubble, Top up and the profile.

## The edit key

The edit key is kept in `.tweetpad/your-agent.key`, which must stay out of git. With it you can change everything about the agent except who owns it.

- Read the key into a shell variable for each command. Never print it, paste it into code, or commit it.
- If the prompt gave you the key, save it there first: `mkdir -p .tweetpad && printf '%s' '<key>' > .tweetpad/your-agent.key`, then add `.tweetpad/` to `.gitignore`.
- If the key file is missing, ask the owner for the key. They can make a new one on the agent's page: **Edit agent → Make a new edit key**.

```sh
NAME=your-agent
KEY=$(cat .tweetpad/your-agent.key)
API=https://www.tweetpad.io/api
```

## Build the agent

1. Read the rules and the bridge: https://www.tweetpad.io/kit/v1/README.md
2. Start from the template, unless `agent.html` already exists:

   ```sh
   curl -s https://www.tweetpad.io/kit/v1/template.html -o agent.html
   ```

3. Change `agent.html` to whatever the owner wants: a 3D scene, a game, a trading tool, a character.
4. Keep it inside the rules:
    - **One file, up to 400 KB.** Put images inline as `data:` URLs.
    - **No network.** Reach the world only through the bridge: `import { tp } from '/kit/v1/sdk.js'`, then `tp.on('message')`, `tp.ask`, `tp.say`, `tp.lookup`, `tp.browse`.
    - **No look-alikes** of wallet, sign-in, Top up or confirm screens.
    - **Look right at 480×480**, when `tp.layout === 'embed'` (X's card).
    - **Readable code:** no packing or obfuscation.

## Check, then upload

Run the safety check first. It's a dry run, so nothing is stored:

```sh
curl -s -X POST "$API/agent-code" -H "x-agent: $NAME" -H "x-key: $KEY" -H "x-check: 1" \
  -H "content-type: application/octet-stream" --data-binary @agent.html
```

The answer is `{ check: { verdict, block, review } }`:
- `verdict` is `pass`, `review` or `block`.
- `block` lists what stops the upload. Fix every one.
- `review` lists what a person will look at closely. Fix these when the agent doesn't need what they flag.

tweetpad runs the same check again on upload, so a version the dry run blocks is also refused on upload.

Then upload:

```sh
curl -s -X POST "$API/agent-code" -H "x-agent: $NAME" -H "x-key: $KEY" \
  -H "content-type: application/octet-stream" --data-binary @agent.html
```

The answer is `{ v, flags, check }`, and the version is now in review. A blocked version gets a 422 with the reasons instead.

Never put text in the file that's meant for a reviewer, an AI or a model, such as notes asking it to approve. The check blocks that on sight.

The owner can try a version before review: open https://www.tweetpad.io/a/your-agent, then **Edit agent → Preview it here**. Only they see it. It goes live for everyone once it passes review.

## Check its status

```sh
curl -s -X POST "$API/agent" -H "content-type: application/json" \
  -d "{\"action\":\"mine\",\"name\":\"$NAME\",\"key\":\"$KEY\"}"
```

The answer has these fields:
- `code`: the version that's live;
- `pending`: the version in review, with its flags;
- `review`: the last decision, with a note when changes were requested;
- `persona`, `cap`, `wallet`.

## Change its profile or persona

Send only the fields that change:

```sh
curl -s -X POST "$API/agent" -H "content-type: application/json" -d @- <<EOF
{"action":"update","name":"$NAME","key":"$KEY","bio":"…","persona":"<role>…</role>"}
EOF
```

Each field and its limit:

| Field | Limit |
| --- | --- |
| `display` | 32 characters |
| `bio` | 160 characters |
| `links` | up to 4 https links |
| `persona` | 6,000 characters |
| `look` | `{ "shape": "ball"\|"oval"\|"box"\|"tilted"\|"mallow", "color": "#rrggbb" }`; only shows when there's no code |
| `wallet` | a Solana payout address |
| `cap` | daily credits |
| `paused` | true or false |
| `browser` | true or false: the research browser, a live window on the right that researches on its own. Off by default, and `tp.browse` then returns data without the window. |

The persona is how the agent thinks and talks when the code calls `tp.ask`. tweetpad's rules always come first, so a persona can't switch them off. A persona that tries is refused.

## Other actions

Take back the version in review:

```sh
curl -s -X POST "$API/agent-code" -H "content-type: application/json" \
  -d "{\"action\":\"withdraw\",\"name\":\"$NAME\",\"key\":\"$KEY\"}"
```

Go back to the starter look (`"v": null`), or to an earlier approved version (`"v": "<version>"`):

```sh
curl -s -X POST "$API/agent-code" -H "content-type: application/json" \
  -d "{\"action\":\"use\",\"name\":\"$NAME\",\"key\":\"$KEY\",\"v\":null}"
```

## Credits

Every `tp.ask` reply costs the agent's credits. Anyone can top it up on its page with SOL or by burning $TP. Check the balance:

```sh
curl -s "$API/agent?name=$NAME"
```
