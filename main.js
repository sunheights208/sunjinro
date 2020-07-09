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

  // console.log(message)

let configData = await fs.readFile(configFile, 'utf-8');
let config = JSON.parse(configData);
let gmData = await fs.readFile(config.gm_file, 'utf-8');
let gmInfo = JSON.parse(gmData);
let playerData = await fs.readFile(config.db_file, 'utf-8');
let allPlayerInfo = JSON.parse(playerData);

  //人狼カテゴリチャンネルの発言以外は弾く
  if (message.channel.parentID != '722131778403303577') return;

  // match(/hoge/)
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
  
  if(message.content.startsWith('終了')) {
    if(!permitCommand(config,gmInfo,message,allPlayerInfo)) return;
    if(!gmInfo.talkNow) {
      message.reply( '発言中しか実行できないよ！' );
      return;
    }
    
    if(gmInfo.nowTalker == "") {
      message.reply( '今は使えないよ！' );
      return;
    }
    
    if(gmInfo.nowTalker != message.author.username) {
      message.reply( '発言者しか実行できないよ！' );
      return;
    }
    gmInfo.talkNow = false;
    await fs.writeFile(config.gm_file, JSON.stringify(gmInfo));
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

    if(gmInfo.hangman != "" && !gmInfo.hang) {
      message.reply( 'まだ吊れないよ！' );
      return;
    }

    const hang = message.content.split(' ')[1];
    // 決戦前に対応させる
    if(gmInfo.hangman == "" && !gmInfo.final_vote_plaer.includes(hang)) {
		  message.reply( '候補者から選んでね！ => ' + gmInfo.final_vote_plaer);
      return 
    }

    const playerInfo = gmInfo.hangman != "" ? allPlayerInfo[gmInfo.hangman]:allPlayerInfo[hang];
    const hangmanName = gmInfo.hangman != "" ? gmInfo.hangman:hang;

    playerInfo.alive = false;
    await fs.writeFile(config.db_file, JSON.stringify(allPlayerInfo));

    message.reply( hangmanName + 'さんを吊りました！\n====================\n' + situation(allPlayerInfo) );

    gmInfo.hang_done=true;
    gmInfo.hang=false;
    gmInfo.hangman = hangmanName;
    gmInfo.talkNow = false;
    await fs.writeFile(config.gm_file, JSON.stringify(gmInfo));

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

  if(message.content.startsWith('戦績')) {
    const resultFilePath = "./public/data/result.json";
    const resultFile = JSON.parse(await fs.readFile(resultFilePath, 'utf-8'));
    let allResult = [];

    for(let key in resultFile){
      const result = resultFile[key]
      const totalResult = (result.total_games != 0) ? Math.round(result.win / result.total_games * 100):0;
      let playerResultStr = "勝率: " + totalResult + "％\n"
      + "　総戦績: " + result.win + "勝" + result.lose + "敗" + "\n"

      for(let key in result){
        if(!["total_games","win","lose"].includes(key)){
          const roleTotalResult = (result[key].total_games != 0) ? Math.round(result[key].win / result[key].total_games * 100):0 
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
    const result = {embed: {
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
    }};
  
    message.channel.send(result);
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