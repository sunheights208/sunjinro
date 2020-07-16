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


const stopGame = async(config,gmInfo,message,allPlayerInfo) => {
  if(gmInfo.stop) {
    message.reply("停止中だよ！")
    return false;
  }

  if(gmInfo.talkNow || gmInfo.time == 'twilight' || gmInfo.time == 'night'){
    gmInfo.stop = true;
    await fs.writeFile(config.gm_file, JSON.stringify(gmInfo));


    let talkTimer = config.timer;
    let talkCounter = 0;
    let gmData;
    while(true){
      gmData = JSON.parse(await fs.readFile(config.gm_file, 'utf-8'));
      if(talkCounter == talkTimer || !gmData.stop) {
        break;
      }
      await sleep(1);
      ++talkCounter;
    }

    message.reply("停止したよ！")
    return true;
  }
  return true;
}

const permitCommand = (config,gmInfo,message,allPlayerInfo) => {

  if(config.join_player.length == 0){
    client.channels.cache.get(config.main_ch).send("== 初期化してね！");
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
      } else if(innerGmInfo.stop){
        innerGmInfo.stop = false;
        innerGmInfo.talkNow = false;
        await fs.writeFile(config.gm_file, JSON.stringify(innerGmInfo));
        return false;
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
  return true;
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
    }else if(innerGmInfo.stop){
      innerGmInfo.stop = false;
      innerGmInfo.talkNow = false;
      await fs.writeFile(config.gm_file, JSON.stringify(innerGmInfo));
      return false;
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
  return true;
}

const breakUp = (client, allPlayerInfo) => {
  client.channels.cache.get('726305512529854504').members.forEach(member => {
    if(allPlayerInfo[serchPlayerNameFromMsg(allPlayerInfo,member.id)].role == '人狼'){
        member.voice.setChannel(client.channels.cache.get('726173962446438502'))
    } else {
      client.channels.cache.forEach(channel => {
        if(channel.type == 'voice' && channel.name == serchPlayerNameFromMsg(allPlayerInfo,member.id)){
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

  const words = [
    {
      word:"人間には裏切ってやろうとたくらんだ裏切りより、心弱きがゆえの裏切りのほうが多いのだ",
      author:"ラ・ロシュフコー"
    },
    {
      word:"信用させた人間を裏切るか得させるか、それが自分の価値",
      author:"高橋がなり"
    },
    {
      word:"商売相手に裏切られ、なんてひどい奴らだと思ったこともありましたが、よく考えれば相手を見る目がなかったのは自分の責任でしかない",
      author:"寺田和正"
    },
    {
      word:"裏切られるってことは、自分を鍛える経験でもあるんだよ。人間色々、仕事も色々だってことを身に染みて知ることになるし、自分がしちゃいけないことを教えてもくれる。実体験は重みが違う",
      author:"岡野雅行"
    },
    {
      word:"信用するのではなく信頼するのだ。信頼とは裏付けも担保もなく相手を信じること。裏切られる可能性があっても相手を信じるのである",
      author:"アルフレッド・アドラー"
    },
    {
      word:"裏切ったヤツと街でばったり出会った時に『よっ、久しぶり！貴様！元気か？』 と笑える、本当の意味で強い人間になりたいと思った",
      author:"長渕剛"
    },
    {
      word:"傷ついても裏切られても、人を最初から疑ってかかるような生き方はしたくない",
      author:"細美武士"
    },
    {
      word:"人は、嘘つくし、裏切るし、離れていくし。それは自分も同じだし。どっちが悪いということもなし",
      author:"小池一夫"
    },
    {
      word:"傷ついたり憎んだり人間不信になったり、恋は楽しいことばかりじゃない。でも恋をしているとき、人間は一番人間らしく生きている",
      author:"西岡徳馬"
    },
    {
      word:"人に裏切られたことなどない。自分が誤解していただけだ",
      author:"高倉健"
    },
    {
      word:"この世界が美しいだと！？ 欲望や妬み、恨み、裏切りに満ちたこの世界が美しいだと！",
      author:"マルス"
    },
    {
      word:"信じて裏切られた事だってあるけど、僕は裏切られても自分が信じた人だから、恨みとか全くないの",
      author:"GENKING"
    },
    {
      word:"誰の友にもなろうとする人間は、誰の友人でもない",
      author:"ヴィルヘルム・ペッファー"
    },
    {
      word:"相手を信用すればするほど、裏切られるのではないかという不安に襲われる",
      author:"代々木忠"
    },
    {
      word:"裏切られてもいいんだ。裏切った相手が卑怯になるだけで、私の何が傷つくわけでもない。裏切って卑怯者になるよりずっといい",
      author:"小野不由美"
    },
    {
      word:"思い通りになると思ってるから裏切られた気がするのよ！",
      author:"おがきちか"
    },
    {
      word:"信用したり期待しなければ裏切られることもないのです。それを頭に入れておくと、意外と対人関係は楽になります",
      author:"美輪明宏"
    },
    {
      word:"信じて裏切られたら、それは自分に裏切られたようなものだ、と思うしかない",
      author:"北方謙三"
    },
    {
      word:"困難な情勢になって初めて、誰が敵か、 誰が味方顔をしていたか　そして誰が本当の味方だったかわかるものだ",
      author:"小林多喜二"
    },
    {
      word:"他の誰を疑おうとかまわんが 仲間を疑うことは俺が許さん",
      author:"近藤勲"
    },
    {
      word:"人間は誰でも自分が一番大切なのです。そして、そのことを本当に自覚した人間だけが自然な形で他人を大切に思うことができるのです",
      author:"五木寛之"
    },
    {
      word:"騙してやろうと待ち構えている奴ほど騙しやすいものだ",
      author:"バトー"
    },
    {
      word:"嘘つきが受ける罰は人が信じてくれないというだけのことではなく、他の誰をも信じられなくなるということである",
      author:"ジョージ・バーナード・ショー"
    },
    {
      word:"人付き合いがうまいというのは、人を許せるということだ",
      author:"ロバート・フロスト"
    },
    {
      word:"「信頼していたのに裏切られた」というような言葉を時々聞く。が、それは、よく聞いてみると、もともと真の信頼ではなく、ただ、もたれかかり、甘え、などで、その期待はずれであることが多い",
      author:"篠田桃紅"
    },
    {
      word:"言葉だけの優しいに騙されてはいけない。優しさとは行動でわかるもの",
      author:"ゲッターズ飯田"
    },
    {
      word:"騙されないで人を愛そう愛されようなんてずいぶん虫のいいことだ",
      author:"川端康成"
    },
    {
      word:"人のために何かをしてあげる。そのことに見返りを期待してはいけない。見返りを期待す人のために何かをしてあげる。そのことに見返りを期待してはいけない。見返りを期待すれば、必ず裏切られる",
      author:"植西聰"
    },
    {
      word:"本当に狡猾なヤツは簡単には尻尾を出さないだろう。くれぐれも注意しろよ",
      author:"キール・ツァイベル"
    },
    {
      word:"オレ『疑い』って嫌な感情だと思ってたけど、違う……信じたいのに信じられない……裏切られるのが怖くて仕方ない……すごく悲しい想いなんだね",
      author:"シング・メテオライト"
    },
    {
      word:"男はよ、女に騙されるために生きてんだ",
      author:"ルパン三世"
    }
  ]

  const choice = shuffle(words)[0];
  
 const result = {embed: {
    author: {
      name: "サンハイツ人狼",
      url: "https://github.com/sunheights208/sunjinro",
      icon_url: client.user.avatarURL()
    },
    title: winSide == 'dark' ? "狼陣営の勝ちです": "村人陣営の勝ちです",
    description: choice.word + "\nー " + choice.author + " ー",
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
    client.channels.cache.get(config.main_ch).send(result);
  } else {
    client.channels.cache.get(config.main_ch).send("今回は結果が出ないよ！")
  }

  // ゲームが終わったのでGMの初期化
  let gmInfo = JSON.parse(await fs.readFile(config.gm_file, 'utf-8'));
  gmInfo.game_master_id = "";
  await fs.writeFile(config.gm_file, JSON.stringify(gmInfo));
  await sleep(5);
  gather(client,allPlayerInfo)
  await sleep(2);
  client.channels.cache.get('726305512529854504').members.forEach(user => {
      user.voice.setMute(false);
  });
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
    resultCheck,
    stopGame
}