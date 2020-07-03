const fs = require('fs/promises');
const { sleep } = require('./jinro_utility');

const jinroInit = async(client,message,configFile) =>{
    let configData = await fs.readFile(configFile, 'utf-8');
    var config = JSON.parse(configData);
      
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
      await fs.writeFile(configFile, JSON.stringify(config));
    
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

      await fs.writeFile(config.db_file, JSON.stringify(playerInfoArrayStart));
    
      // 0:許可　1:出番ではない 　2:実行済み　3:時間切れ
      const initGMFile = {
        start:false,
        time:"moring",
        vote_time:true,
        hang:true,
        bite:1,
        fortune:1,
        knight:1,
        death:"",
        hangman:"",
        vote_list:{},
        vote_turn:[],
        hang_done:false
      }

      await fs.writeFile(config.gm_file, JSON.stringify(initGMFile));
    }
}

const start = async(client, config, allPlayerInfo, gmInfo) => {
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
      let playerInfo = allPlayerInfo[channel.name]
      if(playerInfo) {
        
        const role = roleArray[0];
        playerInfo.role = role
        playerInfo.channel_id = channel.id
        playerInfo.alive = true
        playerInfo.protect = false
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
    for (let key in allPlayerInfo) {
      const playerData = allPlayerInfo[key];
      let notification = "あなたは" + playerData.role + config.emoji[playerData.role] + "です。";
      if(playerData.role == '人狼' && Object.keys(wolfsInfo).length > 1){
        notification += "仲間は\n===========\n"
        for (let key in wolfsInfo) {
          if(key !=playerData.id) notification += wolfsInfo[key] + "\n"
        }
      }

      let whiteList = [];
      if(playerData.role == '占い師'){
        for (let key in allPlayerInfo) {
          if(allPlayerInfo[key].role != '人狼' && allPlayerInfo[key].role != '占い師') whiteList.push(key)
        }
        notification += shuffle( whiteList )[0] + "さんは白でした。（黒は出ないようになってるよ）";
      }

      client.channels.cache.get(playerData.channel_id).send(notification);
    }
    
    // 狼専用チャンネル権限の初期化
    client.channels.cache.get('726173962446438502').overwritePermissions(wolfsCannel);
    gmInfo.start = true;

    // 朝系コマンドの初期化
    gmInfo.vote_list = {};
    gmInfo.vote_turn = [];
    gmInfo.time = "morning";
    gmInfo.vote_time = true;
    gmInfo.hang = false;
    gmInfo.hangman = "";
    gmInfo.hang_done = false;
    gmInfo.death = "";

    await fs.writeFile(config.db_file, JSON.stringify(allPlayerInfo));
    await fs.writeFile(config.gm_file, JSON.stringify(gmInfo));
}

const morning = async(message, config, allPlayerInfo, gmInfo) => {
    let display = "【朝が来ました】\n";
    let joinPlayer = config.join_player;
    joinPlayer = shuffle(joinPlayer);
    const jinroEmoji = config.emoji['人狼'];

    display += gmInfo.death ? jinroEmoji + gmInfo.death + "さんが噛まれて死にました。" + jinroEmoji + "\n": "昨晩は誰も噛まれませんでした。\n"
    
    display += situation(allPlayerInfo);
  
    display += "=========================\n"
    display += "【この順番で話してね！】\n"
    joinPlayer.forEach(player => {
      if(allPlayerInfo[player].alive){
        display += player + "\n"
      }
    });

    message.channel.send(display);

    // 朝系コマンドの初期化
    gmInfo.vote_list = {};
    gmInfo.vote_turn = [];
    gmInfo.time = "morning";
    gmInfo.vote_time = true;
    gmInfo.hang = false;
    gmInfo.hangman = "";
    gmInfo.hang_done = false;

    await fs.writeFile(config.gm_file, JSON.stringify(gmInfo));
}

const night = async(config, gmInfo) => {
    // 夜系コマンドの初期化
    gmInfo.time = "night";
    gmInfo.death = "";
    await fs.writeFile(config.gm_file, JSON.stringify(gmInfo));
}

const voteTime = async(client,config,gmInfo,message,allPlayerInfo) => {
  if(!gmInfo.vote_time) {
    message.reply("投票タイムが終わるまで、このコマンドは使えないよ！");
    return;
  }
  if(gmInfo.time != "morning") {
    message.reply( '朝しか投票できないよ' );
    return;
  }

  let votePlayer = [];
  for (let key in allPlayerInfo) {
    if(allPlayerInfo[key].alive) votePlayer.push(key)
  }
  votePlayer = shuffle( votePlayer )

  client.channels.cache.get(allPlayerInfo[votePlayer[0]].channel_id).send("まずは" + votePlayer[0] + "さんから投票してください\n棄権する場合は「投票 棄権」って入力してね！");
  client.channels.cache.get(config.main_ch).send("まずは" + votePlayer[0] + "さんから投票してください！");

  gmInfo.vote_turn=votePlayer;
  gmInfo.vote_list={};
  gmInfo.vote_time=false;
  await fs.writeFile(config.gm_file, JSON.stringify(gmInfo));
}
module.exports = {
    start,
    morning,
    night,
    jinroInit,
    voteTime
}