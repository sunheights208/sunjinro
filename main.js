// Response for Uptime Robot
const fs = require('fs/promises');
require('dotenv').config();
module.exports = {
  shuffle,
  sendMassageToChannel,
  permitCommand,
  serchRolePlayer,
  situation,
  sleep,
  turnManagement,
  sendTurnMessage
} = require('./modules/jinro_utility.js');

const {
  start,
  morning,
  night,
  jinroInit,
  voteTime
} = require('./modules/jinro_main.js');

const {
  spiritual,
  bite,
  fortune,
  vote
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
let playerData = await fs.readFile(config.db_file, 'utf-8');
let gmInfo = JSON.parse(gmData);
let allPlayerInfo = JSON.parse(playerData);
  // bot自身の発言を除外 & 人狼カテゴリチャンネルの発言以外は弾く
  if (message.author.bot || message.channel.parentID != '722131778403303577') return;
  
  if(message.content.startsWith('初期化')) {
    await jinroInit(client,message,configFile);
    return;
  }
  
  if(message.content.startsWith('開始')) {
    await start(client, config, allPlayerInfo, gmInfo);
    await morning(client, config, allPlayerInfo, gmInfo);
    return;
  }
  
  if(message.content.startsWith('朝')) {
    if(!permitCommand(config,gmInfo,message)) return;
    if(gmInfo.time != "night") {
      message.reply( '夜が来て朝が来るのだ' );
      return;
    }
    
    await morning(client, config, allPlayerInfo, gmInfo);
    return;
  }

  if(message.content.startsWith('夜')) {
    if(!permitCommand(config,gmInfo,message)) return;
    if(gmInfo.time != "morning") {
      message.reply( '朝が来ないと、夜は来ない' );
      return;
    }
    
    await night(config, gmInfo);
    spiritual(allPlayerInfo,gmInfo);

    await fs.writeFile(timerFile, '');
    let nightRoles = ['占い師','騎士','人狼']
    let counter = 10;
    let timerSec = 10;
    while(nightRoles.length + 1 != 0){
      timerFlag = await fs.readFile(timerFile, 'utf-8');
      if(counter == timerSec || timerFlag) {
        if (nightRoles.length == 0) break;
        await sendTurnMessage(client,allPlayerInfo,config, nightRoles[0]);
        await fs.writeFile(timerFile, '');
        nightRoles.shift();
        counter = 0;
      }
      await sleep(1);
      ++counter;
    }


    await sleep(2);
    // let tales = [
    //   'この気もちはなんだろう',
    //   '目に見えないエネルギーの流れが',
    //   '大地からあしのうらを伝わって',
    //   'ぼくの腹へ胸へそうしてのどへ',
    //   '声にならないさけびとなってこみあげる',
    //   'この気もちはなんだろう',
    //   '坂本龍馬「日本の夜明けぜよー！」\n==============='
    // ]
    let tales = [
      'https://tenor.com/view/wake-up-morning-good-morning-get-up-gif-4736758'
    ]
    while(tales.length != 0){
      client.channels.cache.get(config.main_ch).send(tales[0]);
      tales.shift();
      await sleep(3);
    }
    await morning(client, config, allPlayerInfo, gmInfo);
    return;
  }
  
  if(message.content.startsWith('噛む')) {
    await bite(config,gmInfo,message,allPlayerInfo);
    return;
  }

  if(message.content.startsWith('吊る')) {
    if(!permitCommand(config,gmInfo,message)) return;
    if(gmInfo.time != "morning") {
      message.reply( '朝しか吊れないよ' );
      return;
    }

    // 吊った後の抑制
    if(gmInfo.hang_done) {
      message.reply( '1日に1回しか吊れないよ！' );
      return;
    }

    // // 投票前の抑制
    if(!gmInfo.hang) {
      // message.reply( '投票後にしか吊れないよ！' );
      // return;
      message.reply( '今はいつでも吊れるようにしてる' );
    }

    // 投票中の抑制
    if(!gmInfo.vote_time) {
      message.reply( '投票後にしか吊れないよ！' );
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
    await fortune(config,gmInfo,message,allPlayerInfo);
    return;
  }

  if(message.content.startsWith('投票タイム')) {
    if(!permitCommand(config,gmInfo,message)) return;
    await voteTime(client,config,gmInfo,message,allPlayerInfo);
    return;
  }

  if(message.content.startsWith('投票')) {
    if(!permitCommand(config,gmInfo,message)) return;
    await vote(client,config,gmInfo,message,allPlayerInfo);
    return;
  }

  if(message.content.startsWith('守る')) {
    message.reply( 'まだ誰も守ることはできないのだ' );
    return;
  }
  
  if(message.content.startsWith('タイマー')) {
    let time = message.content.split(' ')[1];
    message.reply( time + '秒カウントするよ' );
    if(time > 5) {
      time = time - 5
      await sleep(time);
      message.reply( '5秒前' );
      await sleep(5);
    } else {
      message.reply( time + '秒前' );
      await sleep(time);
    }
    message.reply( '終了' );
  }
  
  if(message.content.startsWith('game')) {
    const time = 10;
    let counter = 0;
    let timerFlag = "";


    await fs.writeFile(timerFile, '');
    message.reply( '10秒カウントするから、残り2秒で止めてね！' );
    await sleep(3);
    message.reply( 'よーい' );
    await sleep(3);
    message.reply( 'スタート！' );
    while(true){
      timerFlag = await fs.readFile(timerFile, 'utf-8');
      if(counter == time || timerFlag) break;
      await sleep(1);
      ++counter;
    }

    if(counter == 2){
      message.reply( '成功!' )
    } else {
      message.reply( counter + 'でした！残念!' )
    }
    return;
  }


  if(message.content.startsWith('stop')) {
    await fs.writeFile(timerFile, 'stop');
    return;
  }
      
  if(message.content.startsWith('ミュートする')) {
    const mute = message.content.split(' ')[1];
    client.guilds.cache.get('221219415650205697').members.cache.forEach(user => {
      if(user.displayName == mute){
        client.guilds.cache.get('221219415650205697').voiceStates.cache.get(user.id).setMute(true)
      }
    });
  }
      
  if(message.content.startsWith('ミュート解除')) {
    const mute = message.content.split(' ')[1];
    const self = message.content.split(' ')[2];
    client.guilds.cache.get('221219415650205697').members.cache.forEach(user => {
      if(user.displayName == mute){
        user.voice.setMute(false);
      }
    });
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