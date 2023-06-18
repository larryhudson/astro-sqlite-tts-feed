# TTS podcast feed with Astro and Azure TTS

## What this is

- A web app that makes it possible to save articles you want to read.
- It generates an audio version of the article using Azure TTS, and saves the content into a sqlite3 database.
- It gives you a podcast feed you can subscribe to.
- It uses Redis + BullMQ to create a task queue for creating articles.

## Where this is up to
- I would like to add a separate JSON API so that I can create an Apple Shortcut to add a new article to the web app. This should be fairly simple.

## Setup instructions
- Clone repo
- run `npm install`
- Copy .env.sample to .env and fill in API key and API region from Azure TTS API
- run `node initialise-db.mjs` to setup the sqlite database.
- Install Redis
    - On Arch Linux, I used:
        ```bash
        sudo pacman -S redis
        systemctl start redis.service
        systemctl enable redis.service
        ```
- run `npm run dev` to start Astro dev server and task queue.

# Astro Starter Kit: Minimal

```
npm create astro@latest -- --template minimal
```

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/withastro/astro/tree/latest/examples/minimal)
[![Open with CodeSandbox](https://assets.codesandbox.io/github/button-edit-lime.svg)](https://codesandbox.io/p/sandbox/github/withastro/astro/tree/latest/examples/minimal)
[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/withastro/astro?devcontainer_path=.devcontainer/minimal/devcontainer.json)

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                | Action                                           |
| :--------------------- | :----------------------------------------------- |
| `npm install`          | Installs dependencies                            |
| `npm run dev`          | Starts local dev server at `localhost:3000`      |
| `npm run build`        | Build your production site to `./dist/`          |
| `npm run preview`      | Preview your build locally, before deploying     |
| `npm run astro ...`    | Run CLI commands like `astro add`, `astro check` |
| `npm run astro --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).
