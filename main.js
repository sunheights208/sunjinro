// Response for Uptime Robot
const http = require('http');
var fs = require("fs");
// require('dotenv').config();

const shuffle = ([...array]) => {
  for (let i = array.length - 1; i >= 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

const permitCommand = (config) => {
  if(config.join_player.length == 0){
    client.channels.cache.get(config.main_ch).send("初期化してね！");
    return false
  }
  return true
}

const start = (config, playerInfoArray) => {
    let roleRaw = config.role_raw;
    let roleArray = shuffle(roleRaw);
    let wolfs = [];

    
    // channelIDの取得
    client.channels.cache.forEach(channel => {
      let playerInfo = playerInfoArray[channel.name]
      if(playerInfo) {
        
        const role = roleArray[0];
        client.channels.cache.get(channel.id).send("あなたは" + role + config.emoji[role] + "です。");
        
        playerInfo.role = role
        playerInfo.channel_id = channel.id
        playerInfo.alive = true
        roleArray.shift();
      
        if(role == '人狼') wolfs.push({
          id:playerInfo.id,
          allow:['VIEW_CHANNEL']
        })
      }
    });
    
    
    // 狼専用チャンネル権限の初期化
    client.channels.cache.get('726173962446438502').overwritePermissions([]);
    client.channels.cache.get('726173962446438502').overwritePermissions(wolfs);

    fs.writeFile(config.db_file, JSON.stringify(playerInfoArray), function (err) {
      if (err) return console.log(err);
      else console.log('file was re-saved');
    });
}

const morning = (config, playerInfoArray) => {
    let display = "【朝が来ました】\n";
    
    for (let key in playerInfoArray) {
      const playerInfo = playerInfoArray[key]
      const displayAlive = playerInfo.alive ? "生存" : "死亡" 
      display += 
        key + "：" + displayAlive + "\n"
    }
  
    display += "========================="
    client.channels.cache.get(config.main_ch).send(display);
      
    let joinPlayer = config.join_player;
    client.channels.cache.get(config.main_ch).send("【この順番で話してね！】");
    client.channels.cache.get(config.main_ch).send(shuffle(joinPlayer));
}

const sleep = (waitMsec) => {
  var startMsec = new Date();
 
  // 指定ミリ秒間だけループさせる（CPUは常にビジー状態）
  while (new Date() - startMsec < waitMsec);
}

// Discord bot implements
const discord = require('discord.js');
const client = new discord.Client();
const configFile = "./public/data/jinroConfig.json";

client.on('ready', message => {
  // id取得
	console.log('bot is ready!');
});

client.on('message', message => {
  
  // bot自身の発言を除外 & 人狼カテゴリチャンネルの発言以外は弾く
  if (message.author.bot || message.channel.parentID != '722131778403303577') return;
  
  // 主要３ファイルを全コマンドで読めるようにしている
  fs.readFile(configFile, function (err,configData) {
    if (err)return console.log(err);
    var config = JSON.parse(configData);
    
    fs.readFile(config.gm_file, function (err,gmData) {
      if (err)return console.log(err);
      var gmInfo = JSON.parse(gmData);
    
    fs.readFile(config.db_file, function (err,playerData) {
      if (err)return console.log(err);
      var playerInfoArray = JSON.parse(playerData);
  
  if(message.content.startsWith('人狼ゲームの初期化')) {
      
    let joinPlayer = config.join_player;
    let playerInfoArrayStart = {};
    
    // playerをconfigに設定
    const initCommandArray = message.content.split(' ');
    if(initCommandArray[1] && initCommandArray[2]){
      const inputMemberArray = initCommandArray[1].split(',');
      const inputRoleArray = initCommandArray[2].split(',');
      let inputUserInfoArrayForChannel = [];
      let inputUserInfoArray = [];
      let inputRoleInfoArray = [];
      
      client.guilds.cache.get('221219415650205697').members.cache.forEach(user => {
        if(inputMemberArray.indexOf(user.displayName) !== -1 ){
          inputUserInfoArrayForChannel.push({
            username:user.displayName,
            id:user.user.id
          });
          inputUserInfoArray.push(user.displayName);
        }
      });
      
      inputRoleArray.forEach(role => {
        if(config.allow_role.indexOf(role) !== -1 ){
          inputRoleInfoArray.push(role)
        }
      });
      
      // エラーチェック
      if(inputUserInfoArrayForChannel.length != inputRoleInfoArray.length){
        client.channels.cache.get(config.main_ch).send(
          "有効なプレイヤー数と有効な役職数が一致していないよ！" + "有効人数："+inputUserInfoArrayForChannel.length + " 有効役職数："+inputRoleInfoArray.length
        );
        return;
      }
      
      //configの初期化
      config.join_player = inputUserInfoArray;
      config.role_raw = inputRoleInfoArray;
      
      // configファイルの初期化
      fs.writeFile(configFile, JSON.stringify(config), function (err) {
        if (err) return console.log(err);
        else console.log('init end!');
      }); 
    
      // チャンネルの初期化
      client.channels.cache.forEach(channel => {
        if (joinPlayer.indexOf(channel.name) !== -1 && channel.parentID == '722131778403303577') {
          channel.delete()
        };
      });
    
      // チャンネルの準備
      inputUserInfoArrayForChannel.forEach(user => {
        client.guilds.cache.get('221219415650205697').channels.create(user.username, {
          type: 'text',
          permissionOverwrites: [
            {
              id: user.id,
              allow: ['VIEW_CHANNEL']
            }
          ],
          parent: client.channels.cache.get('722131778403303577')
        });

        playerInfoArrayStart[user.username] = {"id":user.id}
      })

      fs.writeFile(config.db_file, JSON.stringify(playerInfoArrayStart), function (err) {
        if (err) return console.log(err);
        else console.log('init end!');
      }); 
    
      const initGMFile = {
        start:false
      }

      fs.writeFile(config.gm_file, JSON.stringify(initGMFile), function (err) {
        if (err) return console.log(err);
        else console.log('init end!');
      });
      
      // console.log(config);
      // console.log(gmInfo);
      // console.log(playerInfoArray);
      return;
    }
  }
      
      
  if(message.content.startsWith('確認')) {
    const initCommandArray = message.content.split(' ');
    if(initCommandArray[1] && initCommandArray[2]){
      const inputMemberArray = initCommandArray[1].split(',');
      const inputRoleArray = initCommandArray[2].split(',');
      let message = "参加メンバー\n";
      
      client.guilds.cache.get('221219415650205697').members.cache.forEach(user => {
        if(inputMemberArray.indexOf(user.displayName) !== -1 ){
          message += user.displayName + ":" + user.user.id + "\n"
        }
      })
      
      message += "==================\n"
      
      inputRoleArray.forEach(role => {
        message += role + "\n"
      })
      
      client.channels.cache.get(config.main_ch).send(message);
    }
  }
  
  if(message.content.startsWith('開始')) {
    if(!permitCommand(config)) return;
    start(config, playerInfoArray);
    morning(config, playerInfoArray);
    return;
  }
  
  if(message.content.startsWith('朝')) {
    if(!permitCommand(config)) return;
    morning(config, playerInfoArray);
    return;
  }
  
  if(message.content.startsWith('噛む')) {
    if(!permitCommand(config)) return;
    const killed = message.content.split(' ')[1];
    let players = []
    if(!killed) {
		  message.reply( '噛む人を入れてね！' );
      return 
    }
    
    const playerInfo = playerInfoArray[killed]
    if(!playerInfo || !playerInfo) {
		  message.reply( 'この世に存在する相手を選んでね！' );
      return 
    }

    playerInfo.alive = false;

    fs.writeFile(config.db_file, JSON.stringify(playerInfoArray), function (err) {
      if (err) return console.log(err);
      else console.log('bited!');
    });
  }
  
  
  if(message.content.startsWith('点呼！')) {
		const names = ['砂だ','タナカ'];
    client.channels.cache.forEach(channel => {
        if (channel.name == 'chat'){
            client.channels.cache.forEach(channel => {
              channel.send();
            });
            return;
        }
        return;
    });
  }
});});});});

if(process.env.DISCORD_BOT_TOKEN == undefined)
{
	console.log('please set ENV: DISCORD_BOT_TOKEN');
	process.exit(0);
}

client.login( process.env.DISCORD_BOT_TOKEN );