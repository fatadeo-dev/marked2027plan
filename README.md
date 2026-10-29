# MARKED 2027 Planning Hub: how to put it online (about 15 minutes)

This folder is a small website for the planning committee. It has the plan, comments,
votes with reasons, a deliverables tracker, a dashboard, team sign-up, a careers list
and a decisions log. It runs free on **Vercel**, with a free **Upstash Redis** database
to store comments and updates.

You do NOT need to write any code. Follow the steps below once.

---

## What is in the folder
- `index.html`: the website people see
- `api/data.js`: saves and loads comments, votes and tasks
- `package.json`: tells Vercel this is a Node project
- `README.md`: this guide

---

## Step 1: Put the files on GitHub
1. Create a free account at **github.com** (skip if you have one).
2. Click **New repository**. Name it `marked-2027-hub`, choose **Private**, and click **Create**.
3. On the new repository page, click **"uploading an existing file"**.
4. Unzip the folder on your computer, then drag in **index.html, package.json, README.md and the `api` folder**.
   Check that `api/data.js` appears inside an `api` folder. Then click **Commit changes**.

## Step 2: Create the site on Vercel
1. Go to **vercel.com** and choose **Sign up → Continue with GitHub**. The Hobby plan is free.
2. Click **Add New… → Project**, find `marked-2027-hub`, and click **Import**.
3. Leave the settings as they are (Framework Preset: **Other**) and click **Deploy**.
4. You will get a link like `https://marked-2027-hub.vercel.app`. The page opens, but it shows
   "Demo mode" because the database is not connected yet.

## Step 3: Add the free database
1. In your Vercel project, open the **Storage** tab.
2. Choose **Upstash → Redis** (from the Marketplace), then **Create / Continue**. Pick the **Free** plan and a
   region close to Nigeria if one is offered (e.g. Frankfurt, eu-central-1). Name it `marked-db`.
3. **Connect** it to the `marked-2027-hub` project. Vercel adds the connection keys automatically
   (`KV_REST_API_URL` and `KV_REST_API_TOKEN`).

## Step 4: Set your two passwords
In the project, go to **Settings → Environment Variables** and add:

| Name             | Value (your choice)    | Who uses it |
|------------------|------------------------|-------------|
| `COMMITTEE_CODE` | e.g. `Marked2027!`     | Everyone on the committee, to comment, vote and update tasks |
| `ADMIN_CODE`     | e.g. a different, private code | **Only you (the Director)**, to add, edit and delete tasks and record decisions |

Then go to **Deployments**, click the **⋯** on the latest deployment, and choose **Redeploy**.
The "Demo mode" banner should disappear.

## Step 5: Share it
Send this message on WhatsApp:

> Dear committee, here is our MARKED 2027 planning hub: **[your link]**
> Tap **Sign in**, enter your name, and use the committee code **[code]**.
> 1) Go to **Team** and choose where you will serve.
> 2) Go to **Have Your Say** and vote (with your reason) on the date, one or two days, and the breakout format.
> 3) Read **The Plan** and tap **Discuss** to comment on any section.
> 4) Update your deliverables on **Tracker** as you make progress.

On a phone, members can tap **Share → Add to Home Screen** to use it like an app.

---

## Good to know
- **Live updates:** the page refreshes its data every 30 seconds, so everyone sees changes almost at once.
- **Free limits:** Upstash's free plan is far more than a committee of this size will use.
- **Privacy:** anyone with the link can *read* the plan; only people with the committee code can
  write. **Never put teens' names or the confidential follow-up list on this hub.**
- **Changing the plan text:** edit `index.html` on GitHub (pencil icon) and commit. Vercel republishes automatically
  within a minute. Comments, votes and tasks are kept.
- **Changing the program date countdown:** in `index.html`, search for `PROGRAM_DATE` and change the date.
- **Starting tasks:** the 29 Meeting-1 and timeline tasks appear automatically the first time the site loads.
  The Director can then add, edit or delete tasks on the Tracker tab.
