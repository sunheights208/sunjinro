const fs = require('fs/promises');

const shuffle = ([...array]) => {
    for (let i = array.length - 1; i >= 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

const sendMassageToChannel = (id,message) => {
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

const sendTurnMessage = async(client,allPlayerInfo,config,turnRole) =>{
  let display;
  let role;
  let command;
  if(turnRole == '占い師'){
    display = "【夜になりました。】\n";
    display += "まずは占い師が行動してね！";
    command = '占う';
  } else if(turnRole == '騎士') {
    display = "次に騎士が行動してね！";
    command = '守る';
  } else if (turnRole == '人狼') {
    display = "最後に人狼が行動してね！"
    command = '噛む';
  }
  client.channels.cache.get(config.main_ch).send(display);
  client.channels.cache.get(serchRolePlayer(allPlayerInfo,turnRole)[0].channel_id).send(
    "1分以内に「" + command + " 〇〇」コマンドを打って行動を終わらせてね！\n時間切れになったら何もできなくなるから気をつけてね！"
  );
}

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

module.exports = {
    shuffle,
    sendMassageToChannel,
    permitCommand,
    serchRolePlayer,
    situation,
    sleep,
    turnManagement,
    sendTurnMessage
}