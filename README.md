# 三国杀 Sanguosha — Learning Table

A personal, offline digital version of my physical Sanguosha deck (2024 Yoka edition), built to learn the game against computer opponents. It includes all 89 generals, the full 108-card deck, and English + Chinese text throughout.

> **Private repository — do not make public.**
> The card images in `cropped/` and the card/skill text in `game/data.js` are © 2024 游卡桌游 (Yoka Games) and their illustrators. They are scans of my own copy, kept for personal use only. The game code (rules engine, AI, interface, effects) is my own. Do not enable GitHub Pages; Pages sites are public.

## Folder layout

```
game/        the game (open index.html or mobile.html)
cropped/
  action/    108 action cards + card_back.jpg
  generals/  89 general portraits
```

`game` and `cropped` must sit side by side. The game loads images from `../cropped/`.

## How to play

**Laptop / desktop:** double-click `game/index.html`. It works offline, with nothing to install.

**Phone (via the mini PC):**
1. Clone or download this repository onto the mini PC.
2. In the repository folder, run: `python -m http.server 8000` (use `python3` on some systems).
3. On the phone's browser, open `http://<mini-PC-IP>:8000/game/mobile.html` and bookmark it.

## Features

- Rules engine with all 159 general skills, tested over about 1,500 simulated games.
- Computer opponents that infer hidden roles from players' actions.
- Learning aids: bilingual hover (desktop) or press-and-hold (phone) card text, rule explanations in the log, a 💡 Hint button, action captions, and Autoplay.
- Sound and animation effects, each with an on/off toggle.
- Reference panels for Rules, Cards and Generals.

## Updating

Pull the latest changes (GitHub Desktop → **Fetch/Pull**, or `git pull`), then refresh the browser page.

## Documentation

- Project record (what was built, card retakes, fixes): Claude Docs — *Sanguosha Learning Table — Project Record*
- Strategy guide: Claude Docs — *Sanguosha Strategy Guide*

## Card data notes

- 廖化 Liao Hua 伏枥: printed as 锁定技 on the card, but played as once per game (限定技), per the official rules. It is a misprint.
- 神关羽 God Guan Yu 武魂: victory is checked before death skills resolve, per the official death-settlement order.
