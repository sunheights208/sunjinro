// Response for Uptime Robot
const fs = require('fs/promises');
require('dotenv').config();
module.exports = {
  shuffle,
  sendMessageToChannel,
  permitCommand,
  serchRolePlayer,
  situation,
  sleep,
  turnManagement,
  facilitator,
  breakUp,
  gather,
  serchPlayerNameFromMsg
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

// master confog
// このまま使わないこと！
const voiceCannel = '726305512529854504';
const configFile = "./public/data/jinroConfig.json";
const timerFile = './public/data/realtime_flags/timer.json'

client.on('ready', message => {
	console.log('bot is ready!');
});

client.on('message', message => {
  (async () => {


let configData = await fs.readFile(configFile, 'utf-8');
let config = JSON.parse(configData);
let gmData = await fs.readFile(config.gm_file, 'utf-8');
let gmInfo = JSON.parse(gmData);
let playerData = await fs.readFile(config.db_file, 'utf-8');
let allPlayerInfo = JSON.parse(playerData);
  // bot自身の発言を除外 & 人狼カテゴリチャンネルの発言以外は弾く
  if (message.author.bot || message.channel.parentID != '722131778403303577') return;
  
  if(message.content.startsWith('初期化')) {
    await jinroInit(client,message,configFile);
    return;
  }
  
  if(message.content.startsWith('開始')) {
    if(message.channel.id != config.main_ch){
      message.reply('#village限定コマンド')
      return
    }
    await start(client, config, allPlayerInfo, gmInfo);
    await morning(client, message, config, allPlayerInfo, gmInfo);

    // 初日だけ2回回す（パラメータでやればいいのでは？）
    await facilitator(client, config, allPlayerInfo, gmInfo.toker);
    await facilitator(client, config, allPlayerInfo, gmInfo.toker);
    await voteTime(client,config,gmInfo,allPlayerInfo);
    return;
  }

  if(message.content.startsWith('投票終了')) {
    if(!permitCommand(config,gmInfo,message)) return;
    await twilight(client, config, allPlayerInfo, gmInfo, message);
    spiritual(client,allPlayerInfo,gmInfo);
    await night(client, config, allPlayerInfo, gmInfo, message);

    // 朝の通知
    await sleep(2);
    let tales = [
      'https://tenor.com/view/wake-up-morning-good-morning-get-up-gif-4736758'
    ]
    while(tales.length != 0){
      client.channels.cache.get(config.main_ch).send(tales[0]);
      tales.shift();
      await sleep(3);
    }

    // 昨晩の結果を取得
    gmData = await fs.readFile(config.gm_file, 'utf-8');
    gmInfo = JSON.parse(gmData);
    playerData = await fs.readFile(config.db_file, 'utf-8');
    allPlayerInfo = JSON.parse(playerData);

    // 朝の時間
    await morning(client, message, config, allPlayerInfo, gmInfo);
    await facilitator(client, config, allPlayerInfo, gmInfo.toker);
    await voteTime(client,config,gmInfo,allPlayerInfo);
    return;
  }
  
  if(message.content.startsWith('守る')) {
    await protect(config,gmInfo,message,allPlayerInfo,timerFile);
    return;
  }
  
  if(message.content.startsWith('噛む')) {
    await bite(config,gmInfo,message,allPlayerInfo,timerFile);
    return;
  }

  if(message.content.startsWith('吊る')) {
    if(!permitCommand(config,gmInfo,message)) return;
    let commander = serchPlayerNameFromMsg(allPlayerInfo,message.author.id)
    if(gmInfo.executor != commander) {
      message.reply( '執行人しか実施できないよ' );
      return;
    }

    // 吊った後の抑制
    if(gmInfo.hang_done) {
      message.reply( '1日に1回しか吊れないよ！' );
      return;
    }

    const hang = message.content.split(' ')[1];
    if(!hang) {
		  message.reply( '吊る人を入れてね！' );
      return 
    }
    
    const playerInfo = allPlayerInfo[hang];
    if(!playerInfo || !playerInfo.alive) {
		  message.reply( 'この世に存在する相手を選んでね！' );
      return 
    }

    playerInfo.alive = false;
    fs.writeFile(config.db_file, JSON.stringify(allPlayerInfo), function (err) {
      if (err) return console.log(err);
      else console.log('hangged!');
    });

    message.reply( hang + 'さんを吊りました！\n====================\n' + situation(allPlayerInfo) );

    gmInfo.hang_done=true;
    gmInfo.hang=false;
    gmInfo.hangman=hang;
    fs.writeFile(config.gm_file, JSON.stringify(gmInfo), function (err) {
      if (err) return console.log(err);
    });
  }
  
  if(message.content.startsWith('占う')) {
    await fortune(config,gmInfo,message,allPlayerInfo,timerFile);
    return;
  }

  if(message.content.startsWith('投票')) {
    if(!permitCommand(config,gmInfo,message)) return;
    await vote(client,config,gmInfo,message,allPlayerInfo);
    return;
  }

  if(message.content.startsWith('結果表示')) {
    message.channel.send({embed: {
      author: {
        name: "サンハイツ人狼",
        url: "https://github.com/sunheights208/sunjinro",
        icon_url: client.user.avatarURL()
      },
      title: "狼陣営の勝ちです",
      description: "まだ見た目だけ",
      color: 0xED1B41,
      timestamp: new Date(),
      footer: {
        icon_url: client.user.avatarURL,
        text: "©️ sunheighs jinro"
      },
      thumbnail: {
        url: "https://cdn.discordapp.com/emojis/723955735599251546"
      },
      fields: [
        {
          name: '\u200b',
          value: '================================\n'
          + "　　　　　　　　最終結果　　　　　　　　\n"
          + '================================',
          inline: false,
        },
        {
          name:"------ 狼陣営 ------",
          value: config.emoji['人狼'] + "かいかい\n\n" + config.emoji['狂人']+"タナカ",
          inline: true
        },
        {
          name: '\u200b',
          value: '\u200b',
          inline: true,
        },
        {
          name:"------ 村人陣営 ------",
          value: config.emoji['占い師'] + "おだがみ\n\n" 
          + config.emoji['村人']+"お砂\n\n"
          + config.emoji['騎士']+"のせ\n\n"
          + config.emoji['霊能者']+"みく",
          inline: true
        },
        {
          name: '\u200b',
          value: '================================\n'
          + "　　　　　　　　ログ　　　　　　　　\n"
          + '================================',
          inline: false,
        },
        {
          name: ":one:日目",
          value: "----- 朝 -----\n"
          + "処刑 => " + config.emoji['村人']+"お砂\n\n"
          + "----- 夜 -----\n"
          + "占い => " + config.emoji['騎士']+"のせ\n"
          + "ガード => " + config.emoji['占い師']+"おだがみ\n"
          + "殺害 => " + config.emoji['騎士']+"のせ\n\n"
          + "================="
        },
        {
          name:"------ 狼陣営 ------",
          value: config.emoji['人狼'] + "かいかい\n\n" + config.emoji['狂人']+"タナカ",
          inline: true
        },
        {
          name: '\u200b',
          value: '\u200b',
          inline: true,
        },
        {
          name:"------ 村人陣営 ------",
          value: config.emoji['占い師'] + "おだがみ\n\n" 
          + config.emoji['村人']+"`お砂 was hangged.`\n\n" 
          + config.emoji['騎士']+"`のせ was dead.`\n\n"
          + config.emoji['霊能者']+"みく",
          inline: true
        }
      ]
    }})
    return;
  }
  
  if(message.content.startsWith('クリアメッセージ')) {
    message.channel.bulkDelete(100)
    return;
  }

})().catch(
  (err) => {
    console.log(err);
    // writeFile(config.gmInfo,gmInfo);
    // writeFile(config.db_file,allPlayerInfo);
  }
);
});

if(process.env.DISCORD_BOT_TOKEN == undefined)
{
	console.log('please set ENV: DISCORD_BOT_TOKEN');
	process.exit(0);
}

client.login( process.env.DISCORD_BOT_TOKEN );