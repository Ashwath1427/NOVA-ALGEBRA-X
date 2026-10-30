# Nova Algebra X

**Unlock the Power of Algebra.** A complete school exhibition website built with HTML5, CSS3, vanilla JavaScript, Node.js, Express and Google's official `@google/genai` SDK.

This edition uses **Gemini**, as requested, instead of OpenAI. The AI key and model are read from `process.env.GEMINI_API_KEY` and `process.env.GEMINI_MODEL`. There is no OpenAI dependency or OpenAI key requirement.

## Windows: start here

1. Install **Node.js 22 or newer** from https://nodejs.org (the LTS installer includes npm). Reopen your terminal after installation.
2. Right-click `NovaAlgebraX-Complete-Project.zip` and choose **Extract All**. Open the extracted `NovaAlgebraX` folder containing `package.json` and `server.js`.
3. In File Explorer's address bar, type `cmd` and press Enter. This opens Command Prompt in the right folder.
4. Run:

   ```bat
   npm install
   copy .env.example .env
   notepad .env
   ```

5. In Notepad, replace `paste_your_new_key_here` with your **Gemini API key** from https://aistudio.google.com/apikey. Leave the key only in `.env`. Save and close Notepad. Your file should have this shape (the value below is a placeholder):

   ```dotenv
   GEMINI_API_KEY=paste_your_new_key_here
   PORT=3000
   GEMINI_MODEL=gemini-3.8-flash
   HOST=127.0.0.1
   ```

   Make sure the file is named `.env`, not `.env.txt`. In File Explorer, enable **View → Show → File name extensions** to check. Never put the key in `public/`.
6. Start the project:

   ```bat
   npm start
   ```

7. Open **http://localhost:3000** in Chrome, Edge, or another modern browser. Keep the terminal open while presenting. Press **Ctrl+C** in the terminal to stop.

After initial installation and configuration, the usual commands are simply `npm install` and `npm start`. Do not open `index.html` directly: Express must serve it. The calculator and learning lab also work without a configured API key; Nova AI shows a clear setup message.

**Key handling:** no real key is included in the ZIP. A key shared in a conversation should be replaced in Google AI Studio before use. The supplied credential was used only in memory for a connection check and was not saved in the project. That check timed out; its validity and a live AI response could not be confirmed in the build environment. Add a valid key locally to enable live tutoring. A configured-key label means only that a key is present, not that Google has validated it.

### PowerShell alternative

Use `Copy-Item .env.example .env` instead of `copy`. If PowerShell reports that `npm.ps1` is blocked, use `npm.cmd install` and `npm.cmd start`, or use Command Prompt. You do not need to weaken Windows execution policy.

## What is included

- **Home:** original orbital artwork rendered in CSS, cyan/blue gradients, subtle motion, feature cards and working navigation.
- **Calculator:** solves `ax + b = c` with every step and a substitution check. Handles `a = 0`, both no-solution and infinite-solution cases. Negative values, decimals and scientific notation are accepted; input fractions such as `1/2` should be entered as `0.5`.
- **Exact arithmetic:** add, subtract, multiply and divide. BigInt fractions prevent errors such as `0.1 + 0.2` becoming `0.30000000000000004`. Fractional answers include a decimal approximation. Blank/invalid values and division by zero produce messages.
- **Nova AI:** real server-side Gemini integration with conversation context, student-friendly system instructions, loading state, clear-chat, suggested prompts and honest error messages. No simulated answers or fallback pretending to be AI.
- **Learning Lab:** interactive line graph with an editable equation field, synchronized slope/intercept controls, graph reset, five cycling practice questions, answer checking and hints.
- Responsive layout, keyboard support, visible focus indicators, accessible labels and reduced-motion support. No CDN, external font or image download is required for the interface.

## Folder structure

```text
NovaAlgebraX/
  public/
    index.html
    styles.css
    app.js
    math.js
  test/
    project.test.js
  server.js
  package.json
  package-lock.json
  .env.example
  .gitignore
  README.md
  VERIFICATION.md
```

Styles and scripts are separated from the HTML to keep editing beginner-friendly and allow a strict Content Security Policy. `node_modules/` and your private `.env` are created locally and are deliberately excluded from the ZIP and Git.

## Gemini configuration

The official Google Gen AI SDK runs **only in `server.js`**. It calls `client.models.generateContent` with the chosen model. `GEMINI_MODEL` defaults to `gemini-3.8-flash`; change it to a text-generation model available to your Google project if needed, then restart the server. The model may change over time; consult https://ai.google.dev/gemini-api/docs/models.

Internet access, an API-enabled Google project, model access and sufficient Google API quota are required. Google may charge for usage depending on your project and tier. You do not need an OpenAI key.

The frontend calls:

```http
POST /api/algebra
Content-Type: application/json

{"message":"Solve 2x + 5 = 13","history":[]}
```

Success: `{"reply":"..."}`. Errors: `{"error":"A safe explanation","code":"ERROR_CODE"}`. History consists of complete alternating `{role:"user",text:"..."}` and `{role:"model",text:"..."}` pairs; at most 10 messages are accepted. The UI keeps context only in memory and sends the most recent pairs within the server's size limit. Refreshing or clearing the chat removes the browser's context. A cleared request may already have reached Google and can still count toward usage.

`GET /api/health` reports whether the server is running and a key is configured. It never returns the key and does not make a paid API request.

## Security and operating limits

- Only the `public/` directory is served. `.env`, `server.js` and dependency files are not browser-accessible.
- JSON bodies are limited to 12 KB. Questions are limited to 1,500 characters. History is validated and limited to 10,000 total characters with the current question.
- Same-origin browser requests only; no permissive CORS. Security headers block framing and script injection. Messages are inserted using `textContent`, never trusted HTML.
- API keys are never sent to the frontend. Raw provider errors, request headers and credentials are not logged or returned.
- 20 requests per IP per minute, up to three concurrent requests per server process, with bounded rate-limit state. These are local safeguards, not a distributed production quota system.
- SDK timeout: 25 seconds; server response deadline: 30 seconds; browser timeout: 35 seconds. Error messages distinguish missing keys, key/permission rejection, unavailable models, provider request issues, quota/rate limits, empty responses and network/timeouts. Google sometimes returns the same 429 status for quota and rate limits, so the message covers both.
- Calculator input magnitude: at most 1 trillion; nonzero magnitude at least 0.000000000001; at most 40 input characters. Exact fraction outputs may be larger than the input range.
- Localhost-only by default. This is a local exhibition project, not a publicly authenticated hosted service. If you publish it on the internet, add user authentication, HTTPS and a durable shared limiter first. Do not expose the Node process with an unrestricted public tunnel.
- API access is not needed for calculations, graph exploration or practice after the app has loaded. Nova AI always requires a reachable backend and Gemini.

## Exhibition walkthrough

1. Open Home and introduce how algebra helps us describe digital systems.
2. Launch Calculator and solve `2x + 5 = 13`. Show the substitution check.
3. Try both zero-coefficient examples to discuss why an equation can have no solution or infinitely many.
4. Open Learning Lab and vary the slope. Set it to zero, then move the intercept.
5. Solve a practice challenge.
6. If Gemini is configured, ask Nova AI: “Why do we do the same operation on both sides of an equation?”
7. Return home after exploring the calculator, tutor and Learning Lab.

## Troubleshooting

| Symptom | What to do |
| --- | --- |
| `npm` is not recognized | Install Node.js and reopen Command Prompt. |
| `package.json` not found | Open the extracted folder that actually contains `package.json`. |
| Port already in use | Stop the other process, or change `PORT=3001` and open http://localhost:3001. |
| Nova AI setup needed | Check `.env`, the `GEMINI_API_KEY` spelling and the filename; restart Node. |
| Rejected API key or permissions | Create a valid Gemini Developer API key in AI Studio; check project restrictions and permissions. |
| Rate limit / quota | Wait, then check Google AI Studio usage/quota and billing. Repeated retries do not create quota. |
| Model unavailable | Set `GEMINI_MODEL` to a model your project can use, and restart. |
| Network / timeout | Check internet access and whether the school network permits Google's Gemini API. |
| The app works but AI does not | The calculator is local; AI additionally requires an API key, model access and internet. |

## Tests and modification

Run `npm test` for 14 offline tests. Tests inject a fake provider only inside the test runner; the running application always uses the real Gemini SDK. Test cases cover exact calculations, degenerate equations, validation, security headers, private-file protection, missing keys, success and conversation mapping, secret redaction, provider errors, empty output and local rate limits.

See `VERIFICATION.md` for build verification and the live Gemini limitation.

Edit `public/styles.css` for colours/layout, `public/index.html` for content, `public/app.js` for interactions, `public/math.js` for calculations and the system instruction in `server.js` for tutor behavior. Restart Node after server or `.env` changes. Refresh the browser after frontend edits. The lockfile records the installed dependency versions.

Reference documentation:
- Google SDK: https://googleapis.github.io/js-genai/
- Gemini keys: https://ai.google.dev/gemini-api/docs/api-key
- Gemini troubleshooting: https://ai.google.dev/gemini-api/docs/troubleshooting
