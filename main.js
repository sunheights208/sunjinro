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
  serchPlayerNameFromMsg,
  finalVoteFacilitator,
  resultCheck
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

  //人狼カテゴリチャンネルの発言以外は弾く
  if (message.channel.parentID != '722131778403303577') return;
  
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
    if(!await resultCheck(client, config, message, allPlayerInfo)) return false;
    await morning(client, message, config, allPlayerInfo, gmInfo);

    // 初日だけ2回回す（パラメータでやればいいのでは？）
    // await facilitator(client, config, gmInfo, allPlayerInfo, gmInfo.toker);
    // await facilitator(client, config, gmInfo, allPlayerInfo, gmInfo.toker);
    await voteTime(client,config,gmInfo,allPlayerInfo);
    return;
  }
  
  if(message.content.startsWith('決選投票')) {
    if(!permitCommand(config,gmInfo,message,allPlayerInfo)) return;
    let commander = serchPlayerNameFromMsg(allPlayerInfo,message.author.id)
    if(gmInfo.executor != commander) {
      message.reply( '執行人しか実施できないよ' );
      return;
    }

    let finalMessage = "決選投票に移ります。\n候補者の中から選出してください。=> " + gmInfo.final_vote_plaer;
    client.channels.cache.get(config.main_ch).send(finalMessage);
    // 執行人と話してるので無くてOK
    // await facilitator(client, config, gmInfo, allPlayerInfo, gmInfo.final_vote_plaer);
    await sleep (5);
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
  if(message.content.startsWith('チェック')) {
    await resultCheck(client, config, message, allPlayerInfo);
    return;
  }

  if(message.content.startsWith('吊る')) {
    if(!permitCommand(config,gmInfo,message,allPlayerInfo)) return;
    let commander = serchPlayerNameFromMsg(allPlayerInfo,message.author.id)
    if(gmInfo.executor != commander && !message.author.bot) {
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
		  message.reply( '対象を入れてね！' );
      return 
    }
    
    const playerInfo = allPlayerInfo[hang];
    if(!playerInfo || !playerInfo.alive) {
		  message.reply( 'この世に存在する相手を選んでね！' );
      return 
    }

    if(hang != gmInfo.hangman) {
		  message.reply( 'あれ？吊る人が違うよ？' );
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
    fs.writeFile(config.gm_file, JSON.stringify(gmInfo), function (err) {
      if (err) return console.log(err);
    });

    if(!await resultCheck(client, config, message, allPlayerInfo)) return; 
    client.channels.cache.get(config.main_ch).send("===== 投票終了 =====");
    return;
  }
  
  if(message.content.startsWith('占う')) {
    await fortune(config,gmInfo,message,allPlayerInfo,timerFile);
    return;
  }

  if(message.content.startsWith('投票')) {
    if(!permitCommand(config,gmInfo,message,allPlayerInfo)) return;
    await vote(client,config,gmInfo,message,allPlayerInfo);
    return;
  }

  if(message.author.bot && message.content.startsWith('===== 投票終了 =====')) {
    if(!message.author.bot) {
      message.reply( 'bot限定コマンド' );
      return;
    }

    if(!permitCommand(config,gmInfo,message,allPlayerInfo)) return;
    await sleep(5);
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
    if(!await resultCheck(client, config, message, allPlayerInfo)) return false;
    await morning(client, message, config, allPlayerInfo, gmInfo);
    await facilitator(client, config, gmInfo, allPlayerInfo, gmInfo.toker);
    await voteTime(client,config,gmInfo,allPlayerInfo);
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