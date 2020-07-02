const fs = require('fs/promises');

const fortune = async(config,gmInfo,message,allPlayerInfo) => {
  if(!permitCommand(config,gmInfo,message)) return;
  if(gmInfo.time != "night") {
    message.reply( '夜にしか占えないよ' );
    return;
  }

  // let whoCommanded = allPlayerInfo[message.author.username];
  // if(whoCommanded.role != '占い師') {
  //   message.reply( '占い師しか占えないよ！' );
  //   return 
  // }

  const fortune = message.content.split(' ')[1];

  if(gmInfo.fortune == 1) {
    message.reply( 'まだ出番じゃないよ！' );
    return;
  }

  if(gmInfo.fortune == 2) {
    message.reply( '1回しか占えないよ！' );
    return;
  }

  if(gmInfo.fortune == 3) {
    message.reply( '時間切れだよ！' );
    return;
  }

  if(!fortune) {
    message.reply( '占う人をを入れてね！' );
    return; 
  }
  
  const playerInfo = allPlayerInfo[fortune]
  if(!playerInfo || !playerInfo.alive) {
    message.reply( 'この世に存在する相手を選んでね！' );
    return;
  }

  const side = playerInfo.role == '人狼' ? '黒' : '白'
  
  message.reply( fortune + "さんは" + side + "です。" );

  gmInfo.fortune = 2;
  await fs.writeFile(config.gm_file, JSON.stringify(gmInfo));
}

const spiritual = (allPlayerInfo,gmInfo) => {
    const spiritual = serchRolePlayer(allPlayerInfo,"霊能者")[0];
    if(gmInfo.hangman && spiritual && spiritual.alive){
      const hangman = gmInfo.hangman;
      const hangmanRoll = allPlayerInfo[hangman].role;
      let hangmanSide = (hangmanRoll == '人狼') ? '黒' : '白';
      const message = hangman + "さんは" + hangmanSide + "でした。"
      sendMassageToChannel(spiritual.channel_id,message)
    }
  }

const bite = async(config,gmInfo,message,allPlayerInfo) => {
  if(!permitCommand(config,gmInfo,message)) return;
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
    // MEMO: 自分も狼も噛めるようにした
    // if(playerInfo.role == '人狼') {
    //   message.reply( '狼同士は噛めないよ！' );
    //   return 
    // }

    if(gmInfo.bite == 1) {
      message.reply( 'まだ出番じゃないよ！' );
      return;
    }

    if(gmInfo.bite == 2) {
      message.reply( '1回しか噛めないよ！' );
      return;
    }

    message.reply( killed + 'さんを噛み殺した！' );

    gmInfo.death=killed;
    playerInfo.alive = false;
  }
  await fs.writeFile(config.db_file, JSON.stringify(allPlayerInfo));

  gmInfo.bite = 2;
  await fs.writeFile(config.gm_file, JSON.stringify(gmInfo));
}

const vote = async(client,config,gmInfo,message,allPlayerInfo) => {
  if(gmInfo.time != "morning") {
    message.reply( '朝しか投票できないよ' );
    return;
  }

  if(gmInfo.vote_time) {
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

  let voteCount = gmInfo.vote_list[vote]

  gmInfo.vote_list[vote] = voteCount ? voteCount + 1 : 1;
  gmInfo.vote_turn.shift()

  // 結果発表のタイミング判定
  if(gmInfo.vote_turn.length != 0) {
    client.channels.cache.get(allPlayerInfo[gmInfo.vote_turn[0]].channel_id).send("次に" + gmInfo.vote_turn[0] + "さん、投票してください！\n棄権する場合は「投票 棄権」って入力してね！");
    client.channels.cache.get(config.main_ch).send("次に" + gmInfo.vote_turn[0] + "さん、投票してください！");
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

  await fs.writeFile(config.gm_file, JSON.stringify(gmInfo));
}

  module.exports = {
    spiritual,
    bite,
    fortune,
    vote
}