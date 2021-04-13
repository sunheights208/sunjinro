// Response for Uptime Robot
const fs = require('fs/promises');
require('dotenv').config();
module.exports = {
  shuffle,
  sendMessageToAll,
  permitCommand,
  serchRolePlayer,
  situation,
  sleep,
  facilitator,
  breakUp,
  gather,
  serchPlayerNameFromMsg,
  finalVoteFacilitator,
  resultCheck,
  stopGame
} = require('./modules/jinro_utility.js');

const {
  start,
  morning,
  night,
  jinroInit,
  voteTime,
  twilight
} = require('./modules/jinro_main.js');

const {
  spiritual,
  bite,
  fortune,
  vote,
  protect
} = require('./modules/jinro_role.js');

// Discord bot implements
const discord = require('discord.js');
const client = new discord.Client();
const clientLol = new discord.Client();
const joinBot = new discord.Client();

// master confog
// このまま使わないこと！
const voiceCannel = '726305512529854504';
const configFile = "./public/data/jinroConfig.json";
const timerFile = './public/data/realtime_flags/timer.json'
const joinOutCannel = '831326979726901338';
const joinOutVoiceCannel = '221219416573083648';

const joinNotificateRole = '831356224829390848';

joinBot.on('ready', message => {
  console.log('joinBot is ready!');
});

clientLol.on('ready', message => {
  console.log('lol bot is ready!');
});

client.on('ready', message => {
  console.log('bot is ready!');
});

client.on('message', message => {
  (async () => {

    //人狼カテゴリチャンネルの発言以外は弾く
    if (message.channel.parentID != '722131778403303577') return;

    let configData = await fs.readFile(configFile, 'utf-8');
    let config = JSON.parse(configData);
    let gmData = await fs.readFile(config.gm_file, 'utf-8');
    let gmInfo = JSON.parse(gmData);
    let playerData = await fs.readFile(config.db_file, 'utf-8');
    let allPlayerInfo = JSON.parse(playerData);

    // match(/hoge/)
    if (message.content.startsWith('初期化')) {
      if (!await stopGame(config, gmInfo, message, allPlayerInfo)) return;
      if (gmInfo.game_master_id && message.author.id != gmInfo.game_master_id) {
        message.reply('GMしかコマンドは許可していないよ！');
        return;
      }
      await jinroInit(client, message, configFile);
      return;
    }

    if (message.content.startsWith('開始')) {
      if (!await stopGame(config, gmInfo, message, allPlayerInfo)) return;
      if (config.join_player.length == 0) {
        client.channels.cache.get(config.main_ch).send("== 初期化してね！");
        return false
      }
      if (gmInfo.game_master_id && message.author.id != gmInfo.game_master_id) {
        message.reply('GMしかコマンドは許可していないよ！');
        return;
      }
      if (message.channel.id != config.main_ch) {
        message.reply('#village限定コマンド')
        return
      }
      await start(client, config, allPlayerInfo, gmInfo, message);
      if (!await resultCheck(client, config, message, allPlayerInfo)) return false;
      await morning(client, message, config, allPlayerInfo, gmInfo);

      // 初日だけ2回回す（パラメータでやればいいのでは？）
      if (!await facilitator(client, config)) return;
      if (!await facilitator(client, config)) return;
      await voteTime(client, config, gmInfo, allPlayerInfo);
      return;
    }

    if (message.content.startsWith('決選投票')) {
      if (!permitCommand(config, gmInfo, message, allPlayerInfo)) return;
      let commander = serchPlayerNameFromMsg(allPlayerInfo, message.author.id)
      if (!message.author.bot && gmInfo.executor != commander) {
        message.reply('執行人しか実施できないよ');
        if (config.debug_mode) {
          message.reply('デバッグのため許可');
        } else {
          return;
        }
      }

      let finalMessage = "これより決選投票に移ります。\n候補者の中から選出してください。=> " + gmInfo.final_vote_plaer;
      sendMessageToAll(client, config, allPlayerInfo, finalMessage);
      // 執行人と話してるので無くてOK
      // await facilitator(client, config, gmInfo, allPlayerInfo, gmInfo.final_vote_plaer);
      await voteTime(client, config, gmInfo, allPlayerInfo);
      return;
    }

    if (message.content.startsWith('守る')) {
      await protect(config, gmInfo, message, allPlayerInfo, timerFile);
      return;
    }

    if (message.content.startsWith('噛む')) {
      await bite(config, gmInfo, message, allPlayerInfo, timerFile);
      return;
    }

    if (message.content.startsWith('終了')) {
      if (!permitCommand(config, gmInfo, message, allPlayerInfo)) return;
      if (!gmInfo.talkNow) {
        message.reply('発言中しか実行できないよ！');
        return;
      }

      if (gmInfo.nowTalker == "") {
        message.reply('今は使えないよ！');
        return;
      }

      if (gmInfo.nowTalker != serchPlayerNameFromMsg(allPlayerInfo, message.author.id)) {
        message.reply('発言者しか実行できないよ！');
        if (config.debug_mode) {
          message.reply('デバッグのため許可');
        } else {
          return;
        }
      }

      gmInfo.talkNow = false;
      await fs.writeFile(config.gm_file, JSON.stringify(gmInfo));
      return;
    }

    if (message.content.startsWith('吊る')) {
      if (!permitCommand(config, gmInfo, message, allPlayerInfo)) return;
      let commander = serchPlayerNameFromMsg(allPlayerInfo, message.author.id)

      // TODO
      if (gmInfo.executor != commander && !message.author.bot) {
        message.reply('執行人しか実施できないよ');
        if (config.debug_mode) {
          message.reply('デバッグのため許可');
        } else {
          return;
        }
      }

      // 吊った後の抑制
      if (gmInfo.hang_done) {
        message.reply('1日に1回しか吊れないよ！');
        return;
      }

      if (gmInfo.hangman != "" && !gmInfo.hang) {
        message.reply('まだ吊れないよ！');
        return;
      }

      const hang = message.content.replace(/　/gi, ' ').split(' ')[1];
      // 決戦前に対応させる
      if (gmInfo.hangman == "" && !gmInfo.final_vote_plaer.includes(hang)) {
        message.reply('候補者から選んでね！ => ' + gmInfo.final_vote_plaer);
        return
      }

      const playerInfo = gmInfo.hangman != "" ? allPlayerInfo[gmInfo.hangman] : allPlayerInfo[hang];
      const hangmanName = gmInfo.hangman != "" ? gmInfo.hangman : hang;

      playerInfo.alive = false;
      await fs.writeFile(config.db_file, JSON.stringify(allPlayerInfo));

      message.reply(hangmanName + 'さんを吊りました！\n====================\n' + situation(allPlayerInfo, client));

      gmInfo.hang_done = true;
      gmInfo.hang = false;
      gmInfo.hangman = hangmanName;
      gmInfo.talkNow = false;
      await fs.writeFile(config.gm_file, JSON.stringify(gmInfo));

      if (!await resultCheck(client, config, message, allPlayerInfo)) return;
      sendMessageToAll(client, config, allPlayerInfo, "===== 投票終了 =====");
      return;
    }

    if (message.content.startsWith('占う')) {
      await fortune(config, gmInfo, message, allPlayerInfo, timerFile);
      return;
    }

    if (message.content.startsWith('投票')) {
      if (!permitCommand(config, gmInfo, message, allPlayerInfo)) return;
      await vote(client, config, gmInfo, message, allPlayerInfo);
      return;
    }

    if (message.author.bot && message.content.startsWith('===== 投票終了 =====')) {
      if (!message.author.bot) {
        message.reply('bot限定コマンド');
        return;
      }

      if (!permitCommand(config, gmInfo, message, allPlayerInfo)) return;
      if (!await twilight(client, config, allPlayerInfo, gmInfo, message)) return;
      spiritual(client, allPlayerInfo, gmInfo);
      if (!await night(client, config, allPlayerInfo, gmInfo, message)) return;

      // 朝の通知
      let tales = [
        'https://tenor.com/view/wake-up-morning-good-morning-get-up-gif-4736758'
      ]
      while (tales.length != 0) {
        sendMessageToAll(client, config, allPlayerInfo, tales[0]);
        tales.shift();
      }

      // 昨晩の結果を取得
      gmData = await fs.readFile(config.gm_file, 'utf-8');
      gmInfo = JSON.parse(gmData);
      playerData = await fs.readFile(config.db_file, 'utf-8');
      allPlayerInfo = JSON.parse(playerData);

      // 朝の時間
      if (!await resultCheck(client, config, message, allPlayerInfo)) return false;
      await morning(client, message, config, allPlayerInfo, gmInfo);
      if (!await facilitator(client, config)) return;
      await voteTime(client, config, gmInfo, allPlayerInfo);
      return;
    }

    if (message.content.startsWith('クリアメッセージ')) {
      message.channel.bulkDelete(100)
      return;
    }

    if (message.content.startsWith('戦績')) {
      if (gmInfo.game_master_id && 726412669090922516 == message.channel.id) {
        message.reply("vilage以外で見るか、ゲームが終わってから見てね！");
        return;
      }
      const resultFilePath = "./public/data/result.json";
      const resultFile = JSON.parse(await fs.readFile(resultFilePath, 'utf-8'));
      let allResult = [];

      for (let key in resultFile) {
        const result = resultFile[key]
        const totalResult = (result.total_games != 0) ? Math.round(result.win / result.total_games * 100) : 0;
        let playerResultStr = "勝率: " + totalResult + "％\n"
          + "　総戦績: " + result.win + "勝" + result.lose + "敗" + "\n"

        for (let key in result) {
          if (!["total_games", "win", "lose"].includes(key)) {
            const roleTotalResult = (result[key].total_games != 0) ? Math.round(result[key].win / result[key].total_games * 100) : 0
            playerResultStr += config.emoji[key] + ": " + result[key].win + "勝" + result[key].lose + "敗" + roleTotalResult + "％\n"
          }
        }

        allResult.push(
          {
            name: key,
            value: playerResultStr,
            inline: true
          }
        )
      }
      const result = {
        embed: {
          author: {
            name: "サンハイツ人狼",
            url: "https://github.com/sunheights208/sunjinro",
            icon_url: client.user.avatarURL()
          },
          title: "戦績",
          description: "これまでの戦績",
          color: config.result_color.result,
          timestamp: new Date(),
          footer: {
            icon_url: client.user.avatarURL,
            text: "©️ sunheighs jinro"
          },
          thumbnail: {
            url: "https://cdn.discordapp.com/emojis/" + config.result_emoji.result
          },
          fields: allResult
        }
      };

      sendMessageToAll(client, config, allPlayerInfo, result);
      return;
    }

    if (message.content.startsWith('revive')) {
      return;
    }

    if (message.content.startsWith('デバッグモードON')) {
      let debugConfig1 = JSON.parse(await fs.readFile(configFile, 'utf-8'));

      debugConfig1.debug_mode = true;
      await fs.writeFile(configFile, JSON.stringify(debugConfig1));
      message.reply("ON")
      return;
    }

    if (message.content.startsWith('ファイル')) {
      const foo = await fs.readFile(config.gm_file, 'utf-8');
      const hoge = foo.replace(/,/g, "\n")
      message.reply(hoge);

      const foo1 = await fs.readFile(configFile, 'utf-8');
      const hoge2 = foo1.replace(/,/g, "\n")
      message.reply(hoge2);
      return;
    }

    if (message.content.startsWith('デバッグモードOFF')) {
      let debugConfig2 = JSON.parse(await fs.readFile(configFile, 'utf-8'));

      debugConfig2.debug_mode = false;
      await fs.writeFile(configFile, JSON.stringify(debugConfig2));
      message.reply("OFF")
      return;
    }

    if (message.content.startsWith('バックアップ')) {
      client.channels.cache.get(config.main_ch).send({ files: ['./public/data/result.json'] })
      return;
    }

  })().catch(
    (err) => {
      const error = {
        ERR: err,
        mesg: message.content,
        autor: message.author
      }
      console.log(error)
    }
  );
});

if (process.env.DISCORD_BOT_TOKEN == undefined) {
  console.log('please set ENV: DISCORD_BOT_TOKEN');
  process.exit(0);
}


// sun_lol botの挙動
clientLol.on('message', message => {
  (async () => {

    //botチャンネルのみ
    if (message.channel.id != '716573977429934121') return;

    if (message.content.startsWith('opgg')) {
      let playerUrl = "https://jp.op.gg/summoner/userName={userName}"
      let champUrl = "https://jp.op.gg/champion/{champ}"
      const command = message.content.replace(/　/gi, ' ').split(' ')[1];

      if (command && command == "c") {
        let champs = JSON.parse(await fs.readFile("./public/lol/sun_lol_jp.json", 'utf-8'));
        const champ = message.content.replace(/　/gi, ' ').split(' ')[2];

        for (key in champs) {
          if (champs[key].alias.includes(champ)) {
            message.channel.send(champUrl.replace(/{champ}/g, key));
            return;
          }
        }
      }

      if (command) {
        const name = message.content.replace(/　/gi, ' ').split(' ')[1];
        message.channel.send(playerUrl.replace(/{userName}/g, name));
        return;
      }
      return;
    }
  })().catch(
    (err) => {
      const error = {
        ERR: err,
        mesg: message.content,
        autor: message.author
      }
      console.log(error)
    }
  );
});

joinBot.on('message', message => {
  //botチャンネルのみ
  if (message.channel.id != '716573977429934121') return;
  const messageMember = message.guild.members.cache.get(message.author.id);

  if (message.content.startsWith('join通知ON')) {
    messageMember.roles.add(joinNotificateRole);
    message.reply('付与したよ！');
  }

  if (message.content.startsWith('join通知OFF')) {
    messageMember.roles.remove(joinNotificateRole);
    message.reply('削除したよ！');
  }
})

joinBot.on("voiceStateUpdate", (oldState, newState) => {
  if ((newState.channelID == joinOutVoiceCannel || oldState.channelID == joinOutVoiceCannel)
    && !newState.guild.members.cache.get(newState.id).user.bot) {

    // 対象チャンネルに居る人間の数を数える
    let joinMemberCount = 0;

    newState.guild.voiceStates.cache.forEach(voiceStatesUser => {
      var inRoomMenber = newState.guild.members.cache.get(voiceStatesUser.id);
      if (!inRoomMenber.user.bot && voiceStatesUser.channelID === joinOutVoiceCannel) joinMemberCount++
    });

    // メンバーの数に応じて処理を分岐
    if (joinMemberCount > 0) {
      const joinMember = newState.guild.members.cache.get(newState.id);
      const joinUserNickName = joinMember.nickname;
      joinBot.channels.cache.get(joinOutCannel).bulkDelete(5);
      joinBot.channels.cache.get(joinOutCannel).send('<@&831356224829390848>\n' + joinUserNickName + "がいるよ！");
    }
    else if (joinMemberCount <= 0) {
      const leaveMember = oldState.guild.members.cache.get(newState.id);
      const leaveUserNickName = leaveMember.nickname;
      joinBot.channels.cache.get(joinOutCannel).send("みんないなくなったよ");
    }
  }
});

function exchangeTimestamptToDate(timestamp) {
  var ts = timestamp;
  var d = new Date(ts);
  var year = d.getFullYear();
  var month = d.getMonth() + 1;
  var day = d.getDate();
  var hour = (d.getHours() < 10) ? '0' + d.getHours() : d.getHours();
  var min = (d.getMinutes() < 10) ? '0' + d.getMinutes() : d.getMinutes();
  var sec = (d.getSeconds() < 10) ? '0' + d.getSeconds() : d.getSeconds();
  const date = year + '-' + month + '-' + day + ' ' + hour + ':' + min + ':' + sec;
  return date;
}

client.login(process.env.DISCORD_BOT_TOKEN);
clientLol.login(process.env.DISCORD_LOL_BOT_TOKEN);
joinBot.login(process.env.DISCORD_JOIN_OUT_BOT_TOKEN);