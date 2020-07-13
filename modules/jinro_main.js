const fs = require('fs/promises');
const { sleep } = require('./jinro_utility');
const { forEach } = require('async');

const jinroInit = async(client,message,configFile) =>{
    let configData = await fs.readFile(configFile, 'utf-8');
    var config = JSON.parse(configData);
      
    let joinPlayer = config.join_player;
    let playerInfoArrayStart = {};
    
    // playerをconfigに設定
    const initCommandArray = message.content.replace(/　/gi, ' ').split(' ');
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
        // テキストチャンネルの作成
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

        // ボイスチャンネルの作成
        client.guilds.cache.get('221219415650205697').channels.create(user.username, {
          type: 'voice',
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

      const initGMFile = {
        start:false
      }

      await fs.writeFile(config.gm_file, JSON.stringify(initGMFile));
    }
}

const start = async(client, config, allPlayerInfo, gmInfo, message) => {
    let roleRaw = config.role_raw;
    let roleArray = shuffle(roleRaw);
    // let roleArray = roleRaw.concat()
    let wolfsCannel = [
      {
        id: client.guilds.cache.get('221219415650205697').id,
        deny: ['VIEW_CHANNEL']
      }];
    let wolfsInfo = {}

    
    // channelIDの取得
    client.channels.cache.forEach(channel => {
      let playerInfo = allPlayerInfo[channel.name]
      if(playerInfo && channel.type == 'text') {
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
      } else if (playerInfo && channel.type == 'voice'){
        playerInfo.voice_channel_id = channel.id
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
    // #初期化
    gmInfo.time = "morning";
    gmInfo.vote_time = false;
    gmInfo.final_vote_plaer = [];
    gmInfo.hang = false;
    gmInfo.executor ="";
    gmInfo.talkNow = false;
    gmInfo.hangman = "";
    gmInfo.hang_done = false;
    gmInfo.death = "";
    gmInfo.bite = false;
    gmInfo.fortune = false;
    gmInfo.knight = false;
    gmInfo.vote_list = {};
    gmInfo.vote_turn = [];
    gmInfo.toker = [];
    gmInfo.game_master_id = message.author.id

    await fs.writeFile(config.db_file, JSON.stringify(allPlayerInfo));
    await fs.writeFile(config.gm_file, JSON.stringify(gmInfo));
}

const morning = async(client, message, config, allPlayerInfo, gmInfo) => {
    gmInfo = JSON.parse(await fs.readFile(config.gm_file, 'utf-8'));
    gather(client, allPlayerInfo);
    let display = "【朝が来ました】\n";
    let joinPlayer = config.join_player;
    joinPlayer = shuffle(joinPlayer);
    const jinroEmoji = config.emoji['人狼'];
    gmInfo.toker = [];

    display += gmInfo.death ? jinroEmoji + gmInfo.death + "さんが噛まれて死にました。" + jinroEmoji + "\n": "昨晩は誰も噛まれませんでした。\n"
    
    display += situation(allPlayerInfo);
  
    display += "=========================\n"
    display += "【この順番で話してね！】\n"
    joinPlayer.forEach(player => {
      if(allPlayerInfo[player].alive){
        display += player + "\n"
        gmInfo.toker.push(player);
      }
    });

    message.channel.send(display);

    // 朝系コマンドの初期化
    // #初期化
    gmInfo.vote_list = {};
    gmInfo.vote_turn = [];
    gmInfo.time = "morning";
    gmInfo.vote_time = false;
    gmInfo.final_vote_plaer = [];
    gmInfo.hang = false;
    gmInfo.executor ="";
    gmInfo.hangman = "";
    gmInfo.hang_done = false;

    await fs.writeFile(config.gm_file, JSON.stringify(gmInfo));
}

const twilight = async(client, config, allPlayerInfo, gmInfo) => {
  gmInfo = JSON.parse(await fs.readFile(config.gm_file, 'utf-8'));
  breakUp(client,allPlayerInfo);
  // fs.existsSync('/etc/passwd')
  let eveningRoles = ['占い師','騎士']

  let display = "【黄昏時になりました】\n"
  + "占い師と騎士は1分以内に行動を終わらせてね！"
      
  client.channels.cache.get(config.main_ch).send(display);

  gmInfo.fortune = true;
  gmInfo.knight = true;
  gmInfo.time = 'twilight';
  await fs.writeFile(config.gm_file, JSON.stringify(gmInfo));

  eveningRoles.forEach(role => {
    if(role == '占い師'){
      command = '占う'
    } else if(role == '騎士'){
      command = '守る'
    } else {
      console.log('例外発生')
      return;
    }

    const players = serchRolePlayer(allPlayerInfo,role);
    for(key in players){
      if(players[key].alive) {
        client.channels.cache.get(players[key].channel_id).send(
            "1分以内に「" + command + " 〇〇」コマンドを打って行動を終わらせてね！\n時間切れになったら何もできなくなるから気をつけてね！"
        );
      }
    }
  })

  let evenigTimer = config.timer;
  let counter = 0;
  while(true){
    gmData = await fs.readFile(config.gm_file, 'utf-8');
    gmInfo = JSON.parse(gmData);
    if(counter == evenigTimer) break;
    await sleep(1);
    ++counter;
  }

  // 騎士が行動してなかったら守りを外す
  if(gmInfo.knight){
    for(key in allPlayerInfo){
      if(allPlayerInfo[key].protect){
        allPlayerInfo[key].protect = false;
      }
    }
  }
}

const night = async(client, config, allPlayerInfo, gmInfo) => {
    gmInfo = JSON.parse(await fs.readFile(config.gm_file, 'utf-8'));
    // 夜系コマンドの初期化
    let display = "【夜になりました】\n"
    + "人狼は1分以内に行動を終わらせてね！"
        
    client.channels.cache.get(config.main_ch).send(display);
    client.channels.cache.get(serchRolePlayer(allPlayerInfo,'人狼')[0].channel_id).send(
      "1分以内に「噛む 〇〇」コマンドを打って行動を終わらせてね！\n時間切れになったら何もできなくなるから気をつけてね！"
    );

    gmInfo.time = "night";
    gmInfo.death = "";
    gmInfo.bite = true;
    await fs.writeFile(config.gm_file, JSON.stringify(gmInfo));

    let nightTimer = config.timer;
    let nightCounter = 0;
    let gmData;
    let innerGmInfo;
    while(true){
      gmData = await fs.readFile(config.gm_file, 'utf-8');
      innerGmInfo = JSON.parse(gmData);
      if(nightCounter == nightTimer) {
        break;

      } else if (!innerGmInfo.bite){
        break;
      }
      await sleep(1);
      ++nightCounter;
    }
    // 狼のミュート
    client.channels.cache.get('726173962446438502').members.forEach(user => {
      user.voice.setMute(true);
    });
}

const voteTime = async(client,config,gmInfo,allPlayerInfo) => {
  gmInfo = JSON.parse(await fs.readFile(config.gm_file, 'utf-8'));

  let votePlayer = [];

  // 投票券の配布
  for (let key in allPlayerInfo) {
    if(allPlayerInfo[key].alive) votePlayer.push(key)
  }
  votePlayer = shuffle( votePlayer )

  let voteMassage = "【投票の時間が来ました】\n"
  +"まずは" + votePlayer[0] + "さんから投票してください！"

  client.channels.cache.get(allPlayerInfo[votePlayer[0]].channel_id).send("まずは" + votePlayer[0] + "さんから投票してください\n棄権する場合は「投票 棄権」って入力してね！");
  client.channels.cache.get(config.main_ch).send(voteMassage);

  gmInfo.vote_turn=votePlayer;
  gmInfo.vote_list={};
  gmInfo.vote_time=true;
  await fs.writeFile(config.gm_file, JSON.stringify(gmInfo));
}
module.exports = {
    start,
    morning,
    night,
    jinroInit,
    voteTime,
    twilight
}