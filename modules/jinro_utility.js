const fs = require('fs/promises');

const shuffle = ([...array]) => {
    for (let i = array.length - 1; i >= 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

const sendMessageToChannel = (id,message) => {
    client.channels.cache.get(id).send(message);
  }

const permitCommand = (config,gmInfo,message,allPlayerInfo) => {

  if(config.join_player.length == 0){
    client.channels.cache.get(config.main_ch).send("初期化してね！");
    return false
  }

  if(!gmInfo.start){
    message.reply( '開始してね！' );
    return false
  }
  
  if(!message.author.bot &&
    !serchPlayerNameFromMsg(allPlayerInfo,message.author.id)){    
    message.reply( '参加者しかコマンドは許可していないよ！' );
    console.log("参加者以外:"+message.content)
    return;
  }

  if(message.author.bot && 
    !message.content.startsWith('吊る') && 
    !message.content.startsWith('===== 投票終了 =====')){ 
      return false;
    }

  if(!message.author.bot && !allPlayerInfo[serchPlayerNameFromMsg(allPlayerInfo,message.author.id)].alive){
    message.reply( '君！死んでるよ！' );
    return;
  }

  if(gmInfo.talkNow && !gmInfo.hangman &&
    !message.content.startsWith('終了')){
    message.reply( 'この会話中はコマンドが打てないよ！' );
    return false
  }

  return true
}

const serchRolePlayer = (allPlayerInfo,serchRole) =>{
  let player = [];
  for (let key in allPlayerInfo) {
    const playerInfo = allPlayerInfo[key]
    if(playerInfo.role == serchRole) player.push(playerInfo)
  }
  return player;
}
const serchPlayerNameFromMsg = (allPlayerInfo,id) =>{
  let player;
  for (let key in allPlayerInfo) {
    const playerInfo = allPlayerInfo[key]
    if(playerInfo.id == id) {
      player = key
    }
  }
  return player;
}

const situation = (allPlayerInfo) => {
  let display = "";
  for (let key in allPlayerInfo) {
    const playerInfo = allPlayerInfo[key]
    const displayAlive = playerInfo.alive ? "生存" : "死亡" 
    display += 
      key + "：" + displayAlive + "\n"
  }
  return display;
}

const sleep = sec => new Promise(resolve => setTimeout(resolve, sec * 1000));

const facilitator = async(client, config) => {
  let gmInfo = JSON.parse(await fs.readFile(config.gm_file, 'utf-8'));
  let allPlayerInfo = JSON.parse(await fs.readFile(config.db_file, 'utf-8'));
  let tokerList = gmInfo.toker;

  await sleep(3);
  for(let toker of tokerList) {
    gmInfo.talkNow = true;
    gmInfo.nowTalker = toker;
    await fs.writeFile(config.gm_file, JSON.stringify(gmInfo));
    client.channels.cache.get('726305512529854504').members.forEach(user => {
      if(user.displayName == toker){
        user.voice.setMute(false);
      } else {
        user.voice.setMute(true);
      }
    });
    client.channels.cache.get(config.main_ch).send(toker + "さん。発言してください。");
    client.channels.cache.get(allPlayerInfo[toker].channel_id).send(toker + "さん。発言してください。");

    let talkTimer = config.timer;
    let talkCounter = 0;
    let gmData;
    let innerGmInfo;
    while(true){
      gmData = await fs.readFile(config.gm_file, 'utf-8');
      innerGmInfo = JSON.parse(gmData);
      if(talkCounter == talkTimer) {
        break;

      } else if (!innerGmInfo.talkNow){
        break;
      } else if (talkTimer - talkCounter == 30){
        client.channels.cache.get(config.main_ch).send("　あと30秒");
      } else if (talkTimer - talkCounter == 10){
        client.channels.cache.get(config.main_ch).send("　あと10秒");
      }
      await sleep(1);
      ++talkCounter;
    }
  }

  // 最後に全員黙らせる
  client.channels.cache.get('726305512529854504').members.forEach(user => {
    if(tokerList.indexOf(user.displayName) !== -1){
      user.voice.setMute(true);
    }
  });

  // 最新版にする
  gmInfo = JSON.parse(await fs.readFile(config.gm_file, 'utf-8'));
  gmInfo.talkNow = false;
  gmInfo.nowTalker = "";
  await fs.writeFile(config.gm_file, JSON.stringify(gmInfo));
}

const finalVoteFacilitator = async(client, config, gmInfo, allPlayerInfo, tokerList) => {
  gmInfo = JSON.parse(await fs.readFile(config.gm_file, 'utf-8'));
  gmInfo.talkNow = true;
  await fs.writeFile(config.gm_file, JSON.stringify(gmInfo));

  await sleep(5);
  for(let toker of tokerList) {
    client.channels.cache.get('726305512529854504').members.forEach(user => {
      if(user.displayName == toker) user.voice.setMute(false);
    });
    client.channels.cache.get(allPlayerInfo[toker].channel_id).send(toker + "さん。発言してください。");
  }
  client.channels.cache.get(config.main_ch).send("それでは次の"+tokerList.length + "名の方に発言を許可します。\n[ " + tokerList + "]");

  // 議論タイム
  let talkTimer = config.timer;
  let talkCounter = 0;
  let gmData;
  let innerGmInfo;
  while(true){
    gmData = await fs.readFile(config.gm_file, 'utf-8');
    innerGmInfo = JSON.parse(gmData);
    if(talkCounter == talkTimer) {
      break;
    } else if (talkCounter == 9 && gmInfo.hangman != ""){
      innerGmInfo.hang=true;
      await fs.writeFile(config.gm_file, JSON.stringify(innerGmInfo));
    } else if (!innerGmInfo.talkNow){
      break;
    } else if (talkTimer - talkCounter == 30){
    client.channels.cache.get(config.main_ch).send("　あと30秒");
    } else if (talkTimer - talkCounter == 10){
      client.channels.cache.get(config.main_ch).send("　あと10秒");
    }
    await sleep(1);
    ++talkCounter;
  }

  for(let toker of tokerList) {
    client.channels.cache.get('726305512529854504').members.forEach(user => {
      if(user.displayName == toker) user.voice.setMute(true);
    });
  }
  
  // 最新版にする
  gmInfo = JSON.parse(await fs.readFile(config.gm_file, 'utf-8'));
  gmInfo.talkNow = false;
  await fs.writeFile(config.gm_file, JSON.stringify(gmInfo));
}

const breakUp = (client, allPlayerInfo) => {
  client.channels.cache.get('726305512529854504').members.forEach(member => {
    if(allPlayerInfo[serchPlayerNameFromMsg(allPlayerInfo,message.author.id)].role == '人狼'){
        member.voice.setChannel(client.channels.cache.get('726173962446438502'))
    } else {
      client.channels.cache.forEach(channel => {
        if(channel.type == 'voice' && channel.name == serchPlayerNameFromMsg(allPlayerInfo,message.author.id)){
          member.voice.setChannel(channel)
        }
      })
    }

    // 狼は発言許可
    client.channels.cache.get('726173962446438502').members.forEach(user => {
      user.voice.setMute(false);
    });
  });
}

const gather = (client, allPlayerInfo) => {
  for(let key in allPlayerInfo){
    client.channels.cache.get(allPlayerInfo[key].voice_channel_id).members.forEach(member => {
      member.voice.setChannel('726305512529854504')
    })
  }

  // 人狼ちゃんねるも見に行く
  client.channels.cache.get('726173962446438502').members.forEach(member => {
    member.voice.setChannel('726305512529854504')
  })
}

const resultCheck = async(client, config, message, allPlayerInfo) => {
  let whiteSide = 0;
  let darkSide = 0;
  for(let key in allPlayerInfo){
    let role = allPlayerInfo[key].role;
    let alive = allPlayerInfo[key].alive;
    if(alive && role == '人狼') ++darkSide
    if(alive && (role != '人狼' && role != '狂人')) ++whiteSide;
  }
  let winSide="";
  if(darkSide == 0){
    winSide = 'white';
  } else if(darkSide >= whiteSide) {
    winSide = 'dark';
  } else {
    return true
  }

  await sleep(3);

  // 結果作成
  const resultFilePath = "./public/data/result.json";
  const resultFile = JSON.parse(await fs.readFile(resultFilePath, 'utf-8'));
  let resultDark = "";
  let resultWhite = "";
  for(let key in allPlayerInfo){
    if(!resultFile[key]) resultFile[key] = {
      total_games:0,
      win:0,
      lose:0,
      人狼:{
        total_games:0,
        win:0,
        lose:0
      },
      狂人:{
        total_games:0,
        win:0,
        lose:0
      },
      村人:{
        total_games:0,
        win:0,
        lose:0
      },
      占い師:{
        total_games:0,
        win:0,
        lose:0
      },
      騎士:{
        total_games:0,
        win:0,
        lose:0
      },
      霊能者:{
        total_games:0,
        win:0,
        lose:0
      }
    }
    const role = allPlayerInfo[key].role;
    const alive = allPlayerInfo[key].alive;
    if(role == '人狼' || role == '狂人') {
      if(!alive) {
        resultDark += config.emoji[role] + "`" + key + " is dead`\n\n"
      } else {
        resultDark += config.emoji[role] + key + "\n\n"
      }
      ++resultFile[key].total_games;
      ++resultFile[key][role].total_games;
      (winSide == 'dark') ? ++resultFile[key].win : ++resultFile[key].lose;
      (winSide == 'dark') ? ++resultFile[key][role].win : ++resultFile[key][role].lose;
    }
    if(role != '人狼' && role != '狂人') {
      if(!alive) {
        resultWhite += config.emoji[role] + "`" + key + " is dead`\n\n"
      } else {
        resultWhite += config.emoji[role] + key + "\n\n"
      }
      ++resultFile[key].total_games;
      ++resultFile[key][role].total_games;
      (winSide == 'white') ? ++resultFile[key].win : ++resultFile[key].lose;
      (winSide == 'white') ? ++resultFile[key][role].win : ++resultFile[key][role].lose;
    }
  }
  await fs.writeFile(resultFilePath, JSON.stringify(resultFile));
  
 const result = {embed: {
    author: {
      name: "サンハイツ人狼",
      url: "https://github.com/sunheights208/sunjinro",
      icon_url: client.user.avatarURL()
    },
    title: winSide == 'dark' ? "狼陣営の勝ちです": "村人陣営の勝ちです",
    description: "何か書く",
    color: config.result_color[winSide],
    timestamp: new Date(),
    footer: {
      icon_url: client.user.avatarURL,
      text: "©️ sunheighs jinro"
    },
    thumbnail: {
      url: "https://cdn.discordapp.com/emojis/" + config.result_emoji[winSide]
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
        value: resultDark,
        inline: true
      },
      {
        name: '\u200b',
        value: '\u200b',
        inline: true,
      },
      {
        name:"------ 村人陣営 ------",
        value: resultWhite,
        inline: true
      }
    ]
  }};

  if(resultDark  && resultWhite){
    message.channel.send(result);
  } else {
    message.reply("今回は結果が出ないよ！")
  }

  // ゲームが終わったのでGMの初期化
  let gmInfo = JSON.parse(await fs.readFile(config.gm_file, 'utf-8'));
  gmInfo.game_master_id = "";
  await fs.writeFile(config.gm_file, JSON.stringify(gmInfo));
  return false;
}

module.exports = {
    shuffle,
    sendMessageToChannel,
    permitCommand,
    serchRolePlayer,
    situation,
    sleep,
    facilitator,
    breakUp,
    gather,
    serchPlayerNameFromMsg,
    finalVoteFacilitator,
    resultCheck
}