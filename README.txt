NAVO 3.1 — Vercel deployment (no external provider API key)

WHAT THIS DOES
- Preserves the NAVO animated star/orbit graphics and chat popup from the existing project.
- Uses Vercel AI SDK + Vercel AI Gateway with deployment OIDC where available; it does not require a Gemini/OpenAI provider key.
- Streams the AI response into the chat instead of waiting for the entire answer.
- Attempts DuckDuckGo web search only for current/latest/news or explicitly requested web lookups; passes actual returned snippets to the model and appends the exact URLs retrieved. If search fails, it says so instead of inventing results.
- This is not unlimited free hosting/AI. Vercel AI Gateway has usage limits/credits and may require enabling/configuring AI Gateway for the Vercel project. Model availability and costs can change.

FILES
index.html, style.css, app.js at repository root
api/chat.js at repository root under api/
package.json and vercel.json at repository root

DEPLOY
1. Extract the ZIP on your PC.
2. In GitHub, upload index.html, style.css, app.js, package.json, vercel.json to the repository ROOT (same level, not inside another folder).
3. In GitHub click Add file > Create new file. Enter api/chat.js as the filename, paste the complete contents from the ZIP's api/chat.js, and commit. GitHub creates the api folder from the path.
4. In Vercel, import/connect that repository or open the existing project. Settings > Build & Development Settings: Framework Preset Other; leave Build Command and Output Directory blank. Root Directory must be the folder that contains api/, index.html, package.json.
5. Ensure Vercel AI Gateway/OIDC is available to this Vercel deployment. The AI SDK can use Vercel deployment OIDC on supported production/preview deployments. If your account/project doesn't have Gateway/OIDC access, the API will return an error; there is no honest way to promise real AI without some model access.
6. Redeploy. Test https://YOUR-PROJECT.vercel.app/api/chat in browser; GET should return JSON showing NAVO 3.1. Then test a normal question in the chat.
7. For custom domain, Vercel > Project > Settings > Domains > add navoai.in and follow the exact DNS records Vercel shows.

IMPORTANT
- NAVO 3.1 is the product/display name, not a claim that the underlying model is trained by you.
- The current web search uses DuckDuckGo HTML and can be blocked or incomplete. It only searches for queries classified as current or explicitly asking for search. It is not a guaranteed comprehensive web search engine.
- Do not put any secret keys in browser files or commit them to GitHub.
