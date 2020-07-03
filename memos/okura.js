
  
  if(message.content.startsWith('タイマー')) {
    let time = message.content.split(' ')[1];
    message.reply( time + '秒カウントするよ' );
    if(time > 5) {
      time = time - 5
      await sleep(time);
      message.reply( '5秒前' );
      await sleep(5);
    } else {
      message.reply( time + '秒前' );
      await sleep(time);
    }
    message.reply( '終了' );
  }
  
  if(message.content.startsWith('game')) {
    const time = 10;
    let counter = 0;
    let timerFlag = "";


    await fs.writeFile(timerFile, '');
    message.reply( '10秒カウントするから、残り2秒で止めてね！' );
    await sleep(3);
    message.reply( 'よーい' );
    await sleep(3);
    message.reply( 'スタート！' );
    while(true){
      timerFlag = await fs.readFile(timerFile, 'utf-8');
      if(counter == time || timerFlag) break;
      await sleep(1);
      ++counter;
    }

    if(counter == 2){
      message.reply( '成功!' )
    } else {
      message.reply( counter + 'でした！残念!' )
    }
    return;
  }


  if(message.content.startsWith('stop')) {
    await fs.writeFile(timerFile, 'stop');
    return;
  }
      
  if(message.content.startsWith('ミュートする')) {
    const mute = message.content.split(' ')[1];
    client.guilds.cache.get('221219415650205697').members.cache.forEach(user => {
      if(user.displayName == mute){
        client.guilds.cache.get('221219415650205697').voiceStates.cache.get(user.id).setMute(true)
      }
    });
  }
      
  if(message.content.startsWith('ミュート解除')) {
    const mute = message.content.split(' ')[1];
    const self = message.content.split(' ')[2];
    client.guilds.cache.get('221219415650205697').members.cache.forEach(user => {
      if(user.displayName == mute){
        user.voice.setMute(false);
      }
    });
  }


    // let tales = [
    //   'この気もちはなんだろう',
    //   '目に見えないエネルギーの流れが',
    //   '大地からあしのうらを伝わって',
    //   'ぼくの腹へ胸へそうしてのどへ',
    //   '声にならないさけびとなってこみあげる',
    //   'この気もちはなんだろう',
    //   '坂本龍馬「日本の夜明けぜよー！」\n==============='
    // ]

  

    if(message.content.startsWith('喋る')) {
      message.member.voice.setMute(false);
      return;
    }
  
    if(message.content.startsWith('黙る')) {
      message.member.voice.setMute(true);
      return;
    }