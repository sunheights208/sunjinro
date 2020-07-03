const fs = require('fs/promises');

const fortune = async(config,gmInfo,message,allPlayerInfo,timerFile) => {
  if(!permitCommand(config,gmInfo,message)) return;

  if(!allPlayerInfo[message.channel.name].alive){
    message.reply( '死んでるよ！' );
    return;
  }

  if(gmInfo.time != "twilight") {
    message.reply( '黄昏時にしか占えないよ' );
    return;
  }

  let whoCommanded = allPlayerInfo[message.channel.name];
  if(whoCommanded.role != '占い師') {
    message.reply( '占い師しか占えないよ！' );
    return 
  }

  const fortune = message.content.split(' ')[1];

  if(!gmInfo.fortune) {
    message.reply( '1回しか占えないよ！' );
    return;
  }

  if(!fortune) {
    message.reply( '占う人を入れてね！' );
    return; 
  }
  
  const playerInfo = allPlayerInfo[fortune]
  if(!playerInfo || !playerInfo.alive) {
    message.reply( 'この世に存在する相手を選んでね！' );
    return;
  }

  const side = playerInfo.role == '人狼' ? '黒' : '白'
  
  message.reply( fortune + "さんは" + side + "です。" );

  gmInfo.fortune = false;
  await fs.writeFile(config.gm_file, JSON.stringify(gmInfo));
}

const spiritual = (client,allPlayerInfo,gmInfo) => {
    const spiritual = serchRolePlayer(allPlayerInfo,"霊能者")[0];
    if(gmInfo.hangman && spiritual && spiritual.alive){
      const hangman = gmInfo.hangman;
      const hangmanRoll = allPlayerInfo[hangman].role;
      let hangmanSide = (hangmanRoll == '人狼') ? '黒' : '白';
      const message = hangman + "さんは" + hangmanSide + "でした。"
      client.channels.cache.get(spiritual.channel_id).send(message);
    }
  }

const protect = async(config,gmInfo,message,allPlayerInfo,timerFile) => {
  if(!permitCommand(config,gmInfo,message)) return;

  if(!allPlayerInfo[message.channel.name].alive){
    message.reply( '君！死んでるよ！' );
    return;
  }

  if(gmInfo.time != "twilight") {
    message.reply( '黄昏時にしか動けないのだ' );
    return;
  }

  const protect = message.content.split(' ')[1];
  if(!protect) {
    message.reply( '守る人を入れてね！' );
    return 
  }
  
  const playerInfo = allPlayerInfo[protect]
  if(!playerInfo || !playerInfo.alive) {
    message.reply( 'この世に存在する相手を選んでね！' );
    return;
  }

  if(!gmInfo.knight) {
    message.reply( '1回しか守れないよ！' );
    return;
  }

  if(allPlayerInfo[protect].protect) {
    message.reply( '2回連続で同じ人は守れないよ！' );
    return;
  }

  message.reply( protect + 'さんを守っている！' );

  // 一旦全員の守る情報を初期化
  for(key in allPlayerInfo){
    if(allPlayerInfo[key].protect){
      allPlayerInfo[key].protect = false;
    }
  }

  allPlayerInfo[protect].protect = true;
  await fs.writeFile(config.db_file, JSON.stringify(allPlayerInfo));

  gmInfo.knight = false;
  await fs.writeFile(config.gm_file, JSON.stringify(gmInfo));
}

const bite = async(config,gmInfo,message,allPlayerInfo,timerFile) => {
  if(!permitCommand(config,gmInfo,message)) return;

  if(!allPlayerInfo[message.channel.name].alive){
    message.reply( '君！死んでるよ！' );
    return;
  }

  if(gmInfo.time != "night") {
    message.reply( '夜にしか動けないのだ' );
    return;
  }

  // let whoCommanded = allPlayerInfo[message.author.username];
  // if(whoCommanded.role != '人狼') {
  //   message.reply( '人狼じゃないから噛めないよ！' );
  //   return 
  // }

  const killed = message.content.split(' ')[1];
  if(!killed) {
    message.reply( '噛む人を入れてね！' );
    return 
  }
  
  const playerInfo = allPlayerInfo[killed]
  if(killed != '見逃す' && (!playerInfo || !playerInfo.alive)) {
    message.reply( 'この世に存在する相手を選んでね！' );
    return 
  }

  if(killed == '見逃す'){
    message.reply( '噛まないことにしたよ！' );

  } else {

    if(!gmInfo.bite) {
      message.reply( '1回しか噛めないよ！' );
      return;
    }

    if(playerInfo.protect){
      message.reply( '襲撃失敗！騎士に守られている！' );
    } else {
      message.reply( killed + 'さんを噛み殺した！' );
      gmInfo.death=killed;
      allPlayerInfo[killed].alive = false;
    }
  }
  await fs.writeFile(config.db_file, JSON.stringify(allPlayerInfo));

  gmInfo.bite = false;
  await fs.writeFile(config.gm_file, JSON.stringify(gmInfo));
  await fs.writeFile(timerFile, 'false');
}

const vote = async(client,config,gmInfo,message,allPlayerInfo) => {

  if(!allPlayerInfo[message.channel.name].alive){
    message.reply( '君！死んでるよ！' );
    return;
  }

  if(gmInfo.time != "morning") {
    message.reply( '朝しか投票できないよ' );
    return;
  }

  if(!gmInfo.vote_time) {
    message.reply( 'まだ投票タイムじゃないよ！' );
    return;
  }

  if(allPlayerInfo[gmInfo.vote_turn[0]].channel_id != message.channel.id){
    message.reply(gmInfo.vote_turn[0] + "さんが投票する番だよ！\n自分のチャンネルで投票してね！");
    return;
  }

  const vote = message.content.split(' ')[1];
  if(!vote) {
    message.reply( '投票する人を選んでね！' );
    return; 
  }
  
  const playerInfo = allPlayerInfo[vote]
  if(vote != '棄権' && (!playerInfo || !playerInfo.alive)) {
    message.reply( 'この世に存在する相手を選んでね！' );
    return;
  }
  
  if(vote == '棄権'){
    message.reply( "投票を棄権したよ" );
  } else {
    message.reply( vote + "さんに投票したよ" );
  }

  // リストの読み込み
  if(gmInfo.vote_list[vote]){
    gmInfo.vote_list[vote].count = gmInfo.vote_list[vote].count + 1;
    gmInfo.vote_list[vote].player.push(gmInfo.vote_turn[0]);
  } else {
    gmInfo.vote_list[vote] = {
      count:1,
      player:[gmInfo.vote_turn[0]]
    }
  }
  gmInfo.vote_turn.shift();

  // 結果発表のタイミング判定
  if(gmInfo.vote_turn.length != 0) {
    client.channels.cache.get(allPlayerInfo[gmInfo.vote_turn[0]].channel_id).send("次に" + gmInfo.vote_turn[0] + "さん、投票してください！\n棄権する場合は「投票 棄権」って入力してね！");
    client.channels.cache.get(config.main_ch).send("次に" + gmInfo.vote_turn[0] + "さん、投票してください！");
  } else {
    
    let todayResultMessage = "";
    let hangmans = [];
    for (let key in gmInfo.vote_list) {
      if(key != '棄権' ||
        hangmans.length == 0 || 
        gmInfo.vote_list[hangmans[0]].count == gmInfo.vote_list[key].count) {
        hangmans.push(key);
      } else if (
        key != '棄権' ||
        gmInfo.vote_list[hangmans[0]].count < gmInfo.vote_list[key].count){
        hangmans = [];
        hangmans.push(key);
      }

      todayResultMessage += key + "：" + gmInfo.vote_list[key].count + "票（" + gmInfo.vote_list[key].player + "）\n";
    }

    let headerMessage = "投票結果です。\n================\n"
    if(hangmans.length == 1){
      headerMessage += "今晩処刑される人は" + hangmans[0] + "さんです。\n"
      gmInfo.hang=true;
      gmInfo.vote_time = false;
    } else {
      headerMessage += "次の" + hangmans.length + "人で決戦投票をします。=> " + hangmans + "\n"
      gmInfo.final_vote_plaer = hangmans;
    }

    // 執行人選出
    let executor;
     shuffle(config.join_player).forEach(player =>{
       if(!executor && hangmans.indexOf(player) !== -1){
        executor = player;
       }
     })
    let executorMessage = "執行人は" + executor + "さんです。"
    gmInfo.executor = executor;

    client.channels.cache.get(config.main_ch).send(headerMessage + todayResultMessage + executorMessage);
  }

  await fs.writeFile(config.gm_file, JSON.stringify(gmInfo));
}

  module.exports = {
    spiritual,
    bite,
    fortune,
    vote,
    protect
}