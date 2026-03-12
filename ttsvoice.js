const { Client, GatewayIntentBits } = require("discord.js");
const {
  joinVoiceChannel,
  createAudioPlayer,
  entersState,
  VoiceConnectionStatus,
  AudioPlayerStatus,
} = require("@discordjs/voice");

const config = require("./config");
const filter = require("./messageFilter");
const abbrManager = require("./abbreviationManager");
const voiceManager = require("./voiceManager");
const ttsQueue = require("./ttsQueue");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

let connection = null;
const player = createAudioPlayer();

let abbreviations = abbrManager.load();
let roleVoices = voiceManager.load();

client.once("clientReady", () => {
  console.log(`TTS Bot Ready: ${client.user.tag}`);
});

player.on("error", (error) => {
  console.error("Audio Player Error:", error);
});

player.on(AudioPlayerStatus.Playing, () => {
  console.log("Audio player is playing.");
});

player.on(AudioPlayerStatus.Idle, () => {
  console.log("Audio player is idle.");
});

async function connectToVoice(channel, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const newConnection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: false,
      selfMute: false,
    });

    newConnection.on("error", (err) => {
      console.error(`Voice Connection Error [try ${attempt}]:`, err);
    });

    newConnection.on("stateChange", (oldState, newState) => {
      console.log(
        `Voice state [try ${attempt}]: ${oldState.status} -> ${newState.status}`
      );
    });

    console.log("Trying to connect:", {
      guild: channel.guild.name,
      channel: channel.name,
      joinable: channel.joinable,
      speakable: channel.speakable,
      rtcRegion: channel.rtcRegion,
      attempt,
    });

    try {
      await entersState(newConnection, VoiceConnectionStatus.Ready, 45000);
      newConnection.subscribe(player);
      console.log(`Connected to voice channel: ${channel.name}`);
      return newConnection;
    } catch (error) {
      console.error(`Voice connection failed [try ${attempt}]:`, error);

      try {
        newConnection.destroy();
      } catch (destroyError) {
        console.error("Connection destroy error:", destroyError);
      }

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }
  }

  return null;
}

client.on("messageCreate", async (message) => {
  try {
    if (message.author.bot) return;
    if (!message.guild) return;

    if (message.content === "!join") {
      const channel = message.member?.voice?.channel;

      if (!channel) {
        await message.reply("먼저 음성채널에 들어가 주세요.");
        return;
      }

      console.log("VOICE CHANNEL:", channel.name);
      console.log("BOT CAN JOIN:", channel.joinable);
      console.log("BOT CAN SPEAK:", channel.speakable);

      if (connection) {
        try {
          connection.destroy();
        } catch (e) {
          console.error("Old connection destroy error:", e);
        }
        connection = null;
      }

      connection = await connectToVoice(channel, 3);

      if (!connection) {
        await message.reply("음성채널 연결에 실패했습니다. 잠시 후 다시 시도해주세요.");
        return;
      }

      await message.reply(`음성채널 **${channel.name}**에 연결했습니다.`);
      return;
    }

    if (message.content === "!leave") {
      if (connection) {
        try {
          connection.destroy();
        } catch (e) {
          console.error("Connection destroy error:", e);
        }
        connection = null;
      }

      await message.reply("음성채널에서 나갔습니다.");
      return;
    }

    if (message.content.startsWith("!목소리")) {
      const args = message.content.split(" ");
      const role = message.mentions.roles.first();

      if (!role) {
        await message.reply("사용법: `!목소리 @역할 언어코드`");
        return;
      }

      roleVoices[role.id] = {
        lang: args[2] || "ko",
      };

      voiceManager.save(roleVoices);
      await message.reply(`${role.name} 역할의 목소리를 설정했습니다.`);
      return;
    }

    if (message.content.startsWith("!줄임말")) {
      const args = message.content.split(" ");
      const key = args[1];
      const value = args.slice(2).join(" ");

      if (!key || !value) {
        await message.reply("사용법: `!줄임말 원문 읽을말`");
        return;
      }

      abbreviations[key] = value;
      abbrManager.save(abbreviations);

      await message.reply(`줄임말 등록 완료: ${key} → ${value}`);
      return;
    }

    if (!connection) return;

    const status = connection.state.status;
    if (
      status === VoiceConnectionStatus.Destroyed ||
      status === VoiceConnectionStatus.Disconnected
    ) {
      console.log("Voice connection is not active.");
      return;
    }

    let text = message.content;
    text = filter(text);
    text = abbrManager.apply(text, abbreviations);

    if (!text || !text.trim()) return;
    if (text.length > config.MAX_MESSAGE_LENGTH) return;

    const voice = voiceManager.getVoice(message.member, roleVoices);

    console.log("QUEUE ADD:", {
      text,
      lang: voice.lang,
      user: message.author.tag,
    });

    ttsQueue.add(player, {
      text,
      lang: voice.lang,
    });
  } catch (error) {
    console.error("messageCreate handler error:", error);
  }
});

client.on("error", (error) => {
  console.error("Client Error:", error);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

if (!config.TOKEN) {
  console.error("TOKEN이 설정되지 않았습니다.");
  process.exit(1);
}

client.login(config.TOKEN);