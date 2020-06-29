// Response for Uptime Robot
const http = require('http');
var fs = require("fs");
require('dotenv').config();

const shuffle = ([...array]) => {
  for (let i = array.length - 1; i >= 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

const permitCommand = (config,gmInfo,message) => {
  if(config.join_player.length == 0){
    client.channels.cache.get(config.main_ch).send("初期化してね！");
    return false
  }

  if(!gmInfo.start){
    message.reply( '開始してね！' );
    return false
  }
  return true
}

const start = (config, playerInfoArray, gmInfo) => {
    let roleRaw = config.role_raw;
    let roleArray = shuffle(roleRaw);
    let wolfsCannel = [
      {
        id: client.guilds.cache.get('221219415650205697').id,
        deny: ['VIEW_CHANNEL']
      }];
    let wolfsInfo = {}

    
    // channelIDの取得
    client.channels.cache.forEach(channel => {
      let playerInfo = playerInfoArray[channel.name]
      if(playerInfo) {
        
        const role = roleArray[0];
        playerInfo.role = role
        playerInfo.channel_id = channel.id
        playerInfo.alive = true
        playerInfo.protect = true
        roleArray.shift();
      
        if(role == '人狼') {
          wolfsCannel.push({
            id:playerInfo.id,
            allow:['VIEW_CHANNEL']
          });

          wolfsInfo[playerInfo.id] = channel.name;
        }
      }
    });

    // 全員に通知
    for (let key in playerInfoArray) {
      const playerData = playerInfoArray[key];
      let notification = "あなたは" + playerData.role + config.emoji[playerData.role] + "です。";
      if(playerData.role == '人狼' && Object.keys(wolfsInfo).length > 1){
        notification += "仲間は\n===========\n"
        for (let key in wolfsInfo) {
          if(key !=playerData.id) notification += wolfsInfo[key] + "\n"
        }
      }

      let whiteList = [];
      if(playerData.role == '占い師'){
        for (let key in playerInfoArray) {
          if(playerInfoArray[key].role != '人狼' && playerInfoArray[key].role != '占い師') whiteList.push(key)
        }
        notification += shuffle( whiteList )[0] + "さんは白でした。（黒は出ないようになってるよ）";
      }

      client.channels.cache.get(playerData.channel_id).send(notification);
    }
    
    // 狼専用チャンネル権限の初期化
    client.channels.cache.get('726173962446438502').overwritePermissions(wolfsCannel);

    fs.writeFile(config.db_file, JSON.stringify(playerInfoArray), function (err) {
      if (err) return console.log(err);
      else console.log('file was re-saved');
    });

    gmInfo.start = true;
    fs.writeFile(config.gm_file, JSON.stringify(gmInfo), function (err) {
      if (err) return console.log(err);
    });
}

const situation = (playerInfoArray) => {
  let display = "";
  for (let key in playerInfoArray) {
    const playerInfo = playerInfoArray[key]
    console.log(playerInfo)
    const displayAlive = playerInfo.alive ? "生存" : "死亡" 
    display += 
      key + "：" + displayAlive + "\n"
  }
  return display;
}

const morning = (config, playerInfoArray, gmInfo) => {
    let display = "【朝が来ました】\n";

    display += gmInfo.death ? gmInfo.death + "さんが噛まれて死にました。\n" : "昨晩は誰も噛まれませんでした。\n"
    
    display += situation(playerInfoArray);
  
    display += "========================="
    client.channels.cache.get(config.main_ch).send(display);
      
    let joinPlayer = config.join_player;
    client.channels.cache.get(config.main_ch).send("【この順番で話してね！】");
    client.channels.cache.get(config.main_ch).send(shuffle(joinPlayer));

    // 朝系コマンドの初期化
    gmInfo.vote_list = {};
    gmInfo.vote_turn = [];
    gmInfo.time = "morning";
    gmInfo.vote_time = true;
    gmInfo.hang = false;
    gmInfo.hang_done = false;
    fs.writeFile(config.gm_file, JSON.stringify(gmInfo), function (err) {
      if (err) return console.log(err);
    });
}

const night = (config, playerInfoArray, gmInfo) => {
    let display = "【夜になりました。解散してください。】";
    
    client.channels.cache.get(config.main_ch).send(display);

    // 夜系コマンドの初期化
    gmInfo.time = "night";
    gmInfo.bite = true;
    gmInfo.fortune = true;
    gmInfo.knight = true;
    gmInfo.death = "";
    fs.writeFile(config.gm_file, JSON.stringify(gmInfo), function (err) {
      if (err) return console.log(err);
    });
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
              id: client.guilds.cache.get('221219415650205697').id,
              deny: ['VIEW_CHANNEL']
            },
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
        start:false,
        time:"moring",
        vote_time:true,
        hang:true,
        bite:false,
        fortune:false,
        knight:false,
        death:"",
        vote_list:{},
        vote_turn:[],
        hang_done:false
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
    const killed = message.content.split(' ')[1];
    if(killed){
    message.reply(JSON.stringify(gmInfo[killed]));
    }
  }
  
  if(message.content.startsWith('開始')) {
    start(config, playerInfoArray, gmInfo);
    morning(config, playerInfoArray, gmInfo);
    return;
  }
  
  if(message.content.startsWith('朝')) {
    if(!permitCommand(config,gmInfo,message)) return;
    if(gmInfo.time != "night") {
      message.reply( '夜が来て朝が来るのだ' );
      return;
    }
    
    morning(config, playerInfoArray, gmInfo);
    return;
  }

  if(message.content.startsWith('夜')) {
    if(!permitCommand(config,gmInfo,message)) return;
    if(gmInfo.time != "morning") {
      message.reply( '朝が来ないと、夜は来ない' );
      return;
    }
    
    night(config, playerInfoArray, gmInfo);
    return;
  }
  
  if(message.content.startsWith('噛む')) {
    if(!permitCommand(config,gmInfo,message)) return;
    if(gmInfo.time != "night") {
      message.reply( '夜にしか動けないのだ' );
      return;
    }

    let whoCommanded = playerInfoArray[message.author.username];
    if(whoCommanded.role != '人狼') {
		  message.reply( '人狼じゃないから噛めないよ！' );
      return 
    }

    const killed = message.content.split(' ')[1];
    if(!killed) {
		  message.reply( '噛む人を入れてね！' );
      return 
    }
    
    const playerInfo = playerInfoArray[killed]
    if(killed != '見逃す' && (!playerInfo || !playerInfo.alive)) {
		  message.reply( 'この世に存在する相手を選んでね！' );
      return 
    }

    if(killed == '見逃す'){
      message.reply( '噛まないことにしたよ！' );

    } else {
      if(playerInfo.role == '人狼') {
        message.reply( '狼同士は噛めないよ！' );
        return 
      }

      if(!gmInfo.bite) {
        message.reply( '1回しか噛めないよ！' );
        return;
      }

      message.reply( killed + 'さんを噛み殺した！' );

      gmInfo.death=killed;
      playerInfo.alive = false;
    }

    fs.writeFile(config.db_file, JSON.stringify(playerInfoArray), function (err) {
      if (err) return console.log(err);
      else console.log('bited!');
    });

    gmInfo.bite=false;
    fs.writeFile(config.gm_file, JSON.stringify(gmInfo), function (err) {
      if (err) return console.log(err);
    });
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

    // 投票前の抑制
    if(!gmInfo.hang) {
      message.reply( '投票後にしか吊れないよ！' );
      return;
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
    
    const playerInfo = playerInfoArray[hang];
    if(!playerInfo || !playerInfo.alive) {
		  message.reply( 'この世に存在する相手を選んでね！' );
      return 
    }

    playerInfo.alive = false;
    fs.writeFile(config.db_file, JSON.stringify(playerInfoArray), function (err) {
      if (err) return console.log(err);
      else console.log('hangged!');
    });

    message.reply( hang + 'さんを吊りました！\n====================\n' + situation(playerInfoArray) );

    gmInfo.hang_done=true;
    gmInfo.hang=false;
    fs.writeFile(config.gm_file, JSON.stringify(gmInfo), function (err) {
      if (err) return console.log(err);
    });
  }
  
  if(message.content.startsWith('占う')) {
    if(!permitCommand(config,gmInfo,message)) return;
    if(gmInfo.time != "night") {
      message.reply( '夜にしか占えないよ' );
      return;
    }

    let whoCommanded = playerInfoArray[message.author.username];
    if(whoCommanded.role != '占い師') {
		  message.reply( '占い師しか占えないよ！' );
      return 
    }

    const fortune = message.content.split(' ')[1];
    if(!fortune) {
		  message.reply( '占う人をを入れてね！' );
      return; 
    }
    
    const playerInfo = playerInfoArray[fortune]
    if(!playerInfo || !playerInfo.alive) {
		  message.reply( 'この世に存在する相手を選んでね！' );
      return;
    }

    if(!gmInfo.fortune) {
		  message.reply( '1回しか占えないよ！' );
      return;
    }

    const side = playerInfo.role == '人狼' ? '黒' : '白'
    
    message.reply( fortune + "さんは" + side + "です。" );

    gmInfo.fortune=false;
    fs.writeFile(config.gm_file, JSON.stringify(gmInfo), function (err) {
      if (err) return console.log(err);
    });
    return;
  }

  if(message.content.startsWith('投票タイム')) {
    if(!permitCommand(config,gmInfo,message)) return;
    if(!gmInfo.vote_time) {
      message.reply("投票タイムが終わるまで、このコマンドは使えないよ！");
      return;
    }
    if(gmInfo.time != "morning") {
      message.reply( '朝しか投票できないよ' );
      return;
    }

    let votePlayer = [];
    for (let key in playerInfoArray) {
      if(playerInfoArray[key].alive) votePlayer.push(key)
    }
    votePlayer = shuffle( votePlayer )

    client.channels.cache.get(playerInfoArray[votePlayer[0]].channel_id).send("まずは" + votePlayer[0] + "さんから投票してください");
    client.channels.cache.get(config.main_ch).send("まずは" + votePlayer[0] + "さんから投票してください！\n棄権する場合は「投票する 棄権」って入力してね！");

    gmInfo.vote_turn=votePlayer;
    gmInfo.vote_list={};
    gmInfo.vote_time=false;
    fs.writeFile(config.gm_file, JSON.stringify(gmInfo), function (err) {
      if (err) return console.log(err);
    });
    return;
  }

  if(message.content.startsWith('投票する')) {
    if(!permitCommand(config,gmInfo,message)) return;
    if(gmInfo.time != "morning") {
      message.reply( '朝しか投票できないよ' );
      return;
    }

    if(gmInfo.vote_time) {
      message.reply( 'まだ投票タイムじゃないよ！' );
      return;
    }

    if(playerInfoArray[gmInfo.vote_turn[0]].channel_id != message.channel.id){
      message.reply(gmInfo.vote_turn[0] + "さんが投票する番だよ！\n自分のチャンネルで投票してね！");
      return;
    }

    const vote = message.content.split(' ')[1];
    if(!vote) {
		  message.reply( '投票する人を選んでね！' );
      return; 
    }
    
    const playerInfo = playerInfoArray[vote]
    if(vote != '棄権' && (!playerInfo || !playerInfo.alive)) {
		  message.reply( 'この世に存在する相手を選んでね！' );
      return;
    }
    
    if(vote == '棄権'){
      message.reply( "投票を棄権したよ" );
    } else {
      message.reply( vote + "さんに投票したよ" );
    }

    let voteCount = gmInfo.vote_list[vote]

    gmInfo.vote_list[vote] = voteCount ? voteCount + 1 : 1;
    gmInfo.vote_turn.shift()

    if(gmInfo.vote_turn.length != 0) {
      client.channels.cache.get(playerInfoArray[gmInfo.vote_turn[0]].channel_id).send("次に" + gmInfo.vote_turn[0] + "さん、投票してください");
      client.channels.cache.get(config.main_ch).send("次に" + gmInfo.vote_turn[0] + "さん、投票してください！\n棄権する場合は「投票する 棄権」って入力してね！");
    } else {
      let todayResultMassage = "投票結果です。\n================\n一番投票数の多かった人を吊ってください。\n"

      for (let key in gmInfo.vote_list) {
        todayResultMassage += key + "：" + gmInfo.vote_list[key] + "票\n";
      }

      todayResultMassage += "票が分かれた場合は再度「投票タイム」コマンドを打ち、決選投票を行ってください。"

      client.channels.cache.get(config.main_ch).send(todayResultMassage);
      gmInfo.vote_time = true;
      gmInfo.hang=true;
    }

    fs.writeFile(config.gm_file, JSON.stringify(gmInfo), function (err) {
      if (err) return console.log(err);
    });
  }

  if(message.content.startsWith('守る')) {
    message.reply( 'まだ誰も守ることはできないのだ' );
    return;
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