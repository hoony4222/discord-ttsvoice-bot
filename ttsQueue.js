const googleTTS = require("google-tts-api");
const fetch = require("node-fetch");
const fs = require("fs");
const crypto = require("crypto");
const {
  createAudioResource,
  AudioPlayerStatus,
  entersState,
} = require("@discordjs/voice");

let queue = [];
let playing = false;
let idleHandlerAttached = false;

function ensureCacheDir() {
  if (!fs.existsSync("cache")) {
    fs.mkdirSync("cache");
  }
}

function getCacheFile(text, lang) {
  const hash = crypto
    .createHash("md5")
    .update(`${lang}:${text}`)
    .digest("hex");

  return `cache/${hash}.mp3`;
}

async function generateTTS(text, lang, file) {
  const url = googleTTS.getAudioUrl(text, {
    lang,
    slow: false,
    host: "https://translate.google.com",
  });

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`TTS request failed: ${response.status} ${response.statusText}`);
  }

  const buffer = await response.buffer();

  if (!buffer || buffer.length === 0) {
    throw new Error("TTS response buffer is empty.");
  }

  fs.writeFileSync(file, buffer);
}

async function prepareFile(text, lang) {
  ensureCacheDir();

  const file = getCacheFile(text, lang);

  if (!fs.existsSync(file)) {
    console.log("Generating TTS:", { text, lang, file });
    await generateTTS(text, lang, file);
  } else {
    console.log("Using cached TTS:", { text, lang, file });
  }

  return file;
}

async function play(player, item) {
  const file = await prepareFile(item.text, item.lang);

  const resource = createAudioResource(file);

  player.play(resource);

  await entersState(player, AudioPlayerStatus.Playing, 10000);
}

async function processQueue(player) {
  if (playing) return;
  if (queue.length === 0) return;

  playing = true;

  const item = queue.shift();

  try {
    console.log("QUEUE PLAY:", item);
    await play(player, item);
  } catch (error) {
    console.error("TTS play error:", error);
    playing = false;
    processQueue(player);
  }
}

function attachIdleHandler(player) {
  if (idleHandlerAttached) return;
  idleHandlerAttached = true;

  player.on(AudioPlayerStatus.Idle, () => {
    console.log("Audio player is idle.");
    playing = false;
    processQueue(player);
  });

  player.on("error", (error) => {
    console.error("Audio player internal error:", error);
    playing = false;
    processQueue(player);
  });
}

function add(player, data) {
  if (!data || !data.text || !data.lang) return;

  const cleanText = String(data.text).trim();

  if (!cleanText) return;

  attachIdleHandler(player);

  queue.push({
    text: cleanText,
    lang: data.lang,
  });

  console.log("QUEUE ADD:", {
    text: cleanText,
    lang: data.lang,
    size: queue.length,
  });

  processQueue(player);
}

module.exports = { add };