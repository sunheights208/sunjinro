# Discordで人狼ゲーム・入退出管理・Lolの装備検索ができるbot
## 概要
友人と使っているDiscordサーバー向けの何でもbot。

## 構成
```
sunjinro
├ main.js .. メイン処理。各botの処理が書いてある。
├ modules .. サブ処理。
│　├ jinro_main.js
│　├ jinro_role.js
│　└ jinro_utility.js
│
├ public .. 設定ファイルとデータの格納場所。ファイルをDB代わりに使っている。
│　├ data
│　　├ realtime_flags
│　　　　├ file_lock.json
│　　　　└ timer.json
│　　├ gm.json
│　　├ jinroConfig.json
│　　├ playerInfo.json
│　　└ result.json
│　└ lol
│　　└ sun_lol_jp.json
└
```

## 機能
### 人狼ゲーム
自動で人狼ゲームができる機能。GMとして機能してくれる。役職の決定、発言管理（時間でミュート制御）、人狼の操作（話し合い、殺害）、投票＆追放機能、勝率記録など。

### lolの装備検索BOT
ユーザーの要望に応じてキャラクターの情報URL, プレイヤーの情報のURLを返してくれるbot。多少の表記ゆれにも対応している。

### 入退出通知
誰もいないボイスチャットに人が入るとメンバーのスマホに通知してくれる機能。毎回見に行かないと人がいるのかがわからなかったため便利。通知が要らない人はコマンドを打つと通知を外してくれる。
