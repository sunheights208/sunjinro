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

const turnManagement = async(client,allPlayerInfo,config,turnRole) => {
  await sleep(10);
  // let gmData = await fs.readFile(config.gm_file, 'utf-8');
  // let gmInfo = JSON.parse(gmData);
  // if(turnRole == '占い師'){
  //   gmInfo.fortune = 3;
  //   gmInfo.knight = 0;
  //   await sendTurnMessage(client,allPlayerInfo,config,"人狼");
  // }
}

const facilitator = async(client, config, allPlayerInfo, tokerList) => {
  await sleep(3);
  for(let toker of tokerList) {
    client.channels.cache.get('726305512529854504').members.forEach(user => {
      if(user.displayName == toker){
        user.voice.setMute(false);
      } else {
        user.voice.setMute(true);
      }
    });
    client.channels.cache.get(config.main_ch).send(toker + "さん。発言してください。");
    client.channels.cache.get(allPlayerInfo[toker].channel_id).send(toker + "さん。発言してください。");
    await sleep(5);
  }
}

const finalVoteFacilitator = async(client, config, allPlayerInfo, tokerList) => {
  await sleep(5);

  for(let toker of tokerList) {
    client.channels.cache.get('726305512529854504').members.forEach(user => {
      if(user.displayName == toker) user.voice.setMute(false);
    });
    client.channels.cache.get(allPlayerInfo[toker].channel_id).send(toker + "さん。発言してください。");
  }
  client.channels.cache.get(config.main_ch).send("それでは次の"+tokerList.length + "名の方に発言を許可します。\n[ " + tokerList + "]");

  // 議論タイム
  await sleep(10);

  for(let toker of tokerList) {
    client.channels.cache.get('726305512529854504').members.forEach(user => {
      if(user.displayName == toker) user.voice.setMute(true);
    });
  }
}

const breakUp = (client) => {
  client.channels.cache.get('726305512529854504').members.forEach(member => {
    client.channels.cache.forEach(channel => {
      if(channel.type == 'voice' && channel.name == member.user.username){
        member.voice.setChannel(channel)
      }
    })
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
    finalVoteFacilitator
}