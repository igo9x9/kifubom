phina.globalize();
// GameApp assets: player.png / player2.png / enemy.png / enemy2.png / fire.png

// KIFU RUN - Cross Blast prototype
// Rule: every placed stone produces a cross-shaped blast. Survive as many moves as possible.

var SCREEN_W = 720;
var SCREEN_H = 1280;
var BOARD_N = 19;
var BOARD_SIZE = 650;
var BOARD_LEFT = 35;
var BOARD_TOP = 105;
var GRID = BOARD_SIZE / (BOARD_N - 1);
var STONE_R = GRID * 0.43;
var PLAYER_R = 11;
var ENEMY_R = 13;
var ENEMY_STEP_MS = 105;
var ACTOR_SPRITE_SIZE=32;
var FIRE_SPRITE_SIZE=32;
var STEP_MS = 85;         // 交点から隣の交点への移動時間

var STEPS_PER_TURN = 3;   // warning cross duration
var DROP_MS = 100;       // stone falling duration
var BLAST_DELAY_MS = 0;// delay after landing
var BLAST_MS = 450;     // 爆風が残り続ける時間
var SETTLE_MS = 20;     // interval before next move
var BLAST_ARM_MS = 35;
var BLAST_HALF = GRID * 0.34;

var KIFU_RAW = [
  ['B',16,3], ['W',3,15], ['B',3,2], ['W',16,15], ['B',2,16], ['W',2,15], ['B',3,16], ['W',5,16],
  ['B',5,17], ['W',3,3], ['B',2,3], ['W',2,4], ['B',4,3], ['W',3,4], ['B',2,2], ['W',6,17],
  ['B',4,16], ['W',5,15], ['B',4,15], ['W',4,14], ['B',5,14], ['W',4,13], ['B',1,15], ['W',1,14],
  ['B',1,16], ['W',2,12], ['B',5,13], ['W',4,17], ['B',4,12], ['W',3,13], ['B',3,17], ['W',5,12],
  ['B',7,14], ['W',8,15], ['B',8,14], ['W',9,15], ['B',9,14], ['W',10,15], ['B',4,11], ['W',6,12],
  ['B',6,15], ['W',6,16], ['B',2,10], ['W',1,10], ['B',2,9], ['W',1,9], ['B',1,8], ['W',7,11],
  ['B',10,14], ['W',4,10], ['B',11,15], ['W',2,8], ['B',11,16], ['W',5,18], ['B',5,10], ['W',4,9],
  ['B',3,8], ['W',2,7], ['B',4,8], ['W',5,9], ['B',1,7], ['W',3,9], ['B',2,6], ['W',3,7],
  ['B',8,17], ['W',9,17], ['B',10,17], ['W',9,18], ['B',5,8], ['W',2,11], ['B',3,6], ['W',4,7],
  ['B',4,4], ['W',5,7], ['B',6,8], ['W',6,7], ['B',15,16], ['W',16,16], ['B',15,15], ['W',15,14],
  ['B',16,17], ['W',17,17], ['B',15,17], ['W',16,13], ['B',17,14], ['W',16,14], ['B',16,11], ['W',11,14],
  ['B',13,14], ['W',11,13], ['B',9,11], ['W',13,13], ['B',14,13], ['W',14,14], ['B',13,15], ['W',13,12],
  ['B',6,9], ['W',3,10], ['B',9,9], ['W',4,5], ['B',3,5], ['W',7,13], ['B',10,12], ['W',15,10],
  ['B',14,11], ['W',15,11], ['B',14,12], ['W',0,15], ['B',14,10], ['W',16,10], ['B',16,8], ['W',14,9],
  ['B',12,11], ['W',14,2], ['B',11,2], ['W',16,6], ['B',6,14], ['W',8,16], ['B',15,2], ['W',14,3],
  ['B',15,4], ['W',14,6], ['B',14,4], ['W',12,3], ['B',2,14], ['W',3,14], ['B',17,10], ['W',13,9],
  ['B',17,11], ['W',15,12], ['B',12,10], ['W',16,7], ['B',17,8], ['W',17,13], ['B',15,8], ['W',14,7],
  ['B',14,8], ['W',13,8], ['B',17,5], ['W',18,7], ['B',12,5], ['W',12,7], ['B',13,6], ['W',13,5],
  ['B',13,4], ['W',11,3], ['B',12,2], ['W',10,2], ['B',14,1], ['W',10,1], ['B',7,2], ['W',13,1],
  ['B',13,2], ['W',13,3], ['B',12,1], ['W',8,3], ['B',7,3], ['W',8,4], ['B',6,10], ['W',5,11]
];
var KIFU = KIFU_RAW.map(function(m, i) {
  return { color:m[0], x:m[1], y:m[2], move:i+1 };
});

function clamp(v,min,max) { return Math.max(min,Math.min(max,v)); }
function distance(ax,ay,bx,by) { var x=ax-bx,y=ay-by; return Math.sqrt(x*x+y*y); }
function gridToWorld(gx,gy) { return {x:BOARD_LEFT+gx*GRID,y:BOARD_TOP+gy*GRID}; }

phina.define('GoBoard', {
  superClass:'DisplayElement',
  init:function() {
    this.superInit();
    RectangleShape({width:BOARD_SIZE+46,height:BOARD_SIZE+46,fill:'#d7a653',stroke:'#6f471e',strokeWidth:4})
      .setPosition(BOARD_LEFT+BOARD_SIZE/2,BOARD_TOP+BOARD_SIZE/2).addChildTo(this);
    for (var i=0;i<BOARD_N;i++) {
      var p=i*GRID;
      RectangleShape({width:BOARD_SIZE,height:1.5,fill:'#3a2715',stroke:null})
        .setPosition(BOARD_LEFT+BOARD_SIZE/2,BOARD_TOP+p).addChildTo(this);
      RectangleShape({width:1.5,height:BOARD_SIZE,fill:'#3a2715',stroke:null})
        .setPosition(BOARD_LEFT+p,BOARD_TOP+BOARD_SIZE/2).addChildTo(this);
    }
    var self=this;
    [3,9,15].forEach(function(gx){ [3,9,15].forEach(function(gy){
      var q=gridToWorld(gx,gy);
      CircleShape({radius:4.5,fill:'#3a2715',stroke:null}).setPosition(q.x,q.y).addChildTo(self);
    });});
  }
});

phina.define('Stone', {
  superClass:'CircleShape',
  init:function(color) {
    var black=color==='B';
    this.superInit({radius:STONE_R,fill:black?'#181818':'#f4f1e8',stroke:black?'#050505':'#aaa69e',strokeWidth:2});
    this.goColor=color;
  }
});

phina.define('Player',{superClass:'Sprite',init:function(){this.superInit('playerImage',16,16);this.setSize(ACTOR_SPRITE_SIZE,ACTOR_SPRITE_SIZE);}});
phina.define('Enemy',{superClass:'Sprite',init:function(){this.superInit('enemyImage',16,16);this.setSize(ACTOR_SPRITE_SIZE,ACTOR_SPRITE_SIZE);}});
phina.define('FireTile',{superClass:'Sprite',init:function(){this.superInit('fireImage',16,16);this.setSize(FIRE_SPRITE_SIZE,FIRE_SPRITE_SIZE);}});
phina.define('PlayerHit',{superClass:'Sprite',init:function(){this.superInit('playerHitImage',16,16);this.setSize(ACTOR_SPRITE_SIZE,ACTOR_SPRITE_SIZE);}});
phina.define('EnemyHit',{superClass:'Sprite',init:function(){this.superInit('enemyHitImage',16,16);this.setSize(ACTOR_SPRITE_SIZE,ACTOR_SPRITE_SIZE);}});
phina.define('MainScene', {
  superClass:'DisplayScene',
  init:function(options) {
    this.superInit(options);
    this.backgroundColor='#17120d';
    this.state='intro';
    this.moveIndex=0;
    this.timer=0;
    this.target=null;
    this.stones=[];
    this.board=Array.from({length:BOARD_N},function(){return Array(BOARD_N).fill(null);});
    this.stoneMap={};
    this.moveX=0; this.moveY=0;
    this.joyActive=false; this.joyOrigin={x:0,y:0};
    this.warningParts=[]; this.activeBlasts=[];
    this.playerGridX=9; this.playerGridY=9;
    this.stepMoving=false; this.stepCooldown=0; this.lastStepDir='';
    this.stepsLeft=STEPS_PER_TURN;
    this.enemy=null; this.enemyGridX=-1; this.enemyGridY=-1; this.enemyNeedsSpawn=true;
    // プレイヤー3歩につき敵は2歩。3歩目だけ敵を休ませる。
    this.playerStepInTurn=0;

    GoBoard().addChildTo(this);
    this.blastLayer=DisplayElement().addChildTo(this);
    this.stoneLayer=DisplayElement().addChildTo(this);
    this.effectLayer=DisplayElement().addChildTo(this);
    this.uiLayer=DisplayElement().addChildTo(this);

    var s=gridToWorld(this.playerGridX,this.playerGridY);
    this.player=Player().setPosition(s.x,s.y).addChildTo(this.effectLayer);

    this.joyBase=CircleShape({radius:58,fill:'rgba(255,255,255,.10)',stroke:'rgba(255,255,255,.4)',strokeWidth:3}).addChildTo(this.uiLayer); this.joyBase.hide();
    this.joyKnob=CircleShape({radius:25,fill:'rgba(255,255,255,.55)',stroke:'rgba(255,255,255,.8)',strokeWidth:2}).addChildTo(this.uiLayer); this.joyKnob.hide();
    this.createPortraitControls();

    this.makeIntro();
    this.setInteractive(true);
    var self=this;
    this.on('pointstart',function(e){self.pointerStart(e);});
    this.on('pointmove',function(e){self.pointerMove(e);});
    this.on('pointend',function(){self.releaseJoystick();});
  },

  makeIntro:function() {
    var self=this;
    this.overlay=RectangleShape({width:SCREEN_W,height:SCREEN_H,fill:'rgba(10,8,6,.80)',stroke:null})
      .setPosition(SCREEN_W/2,SCREEN_H/2).addChildTo(this.uiLayer);
    Label({text:'盤上サバイバル',fontSize:62,fill:'#fff',fontWeight:'bold'}).setPosition(0,-300).addChildTo(this.overlay);
    Label({text:'碁石が爆発します。３歩で避難してください。\n追いかけてくる敵にも注意しましょう。',fontSize:25,fill:'#eee5d8',lineHeight:1.5})
      .setPosition(0,-135).addChildTo(this.overlay);
    var button=RectangleShape({width:280,height:76,fill:'#e8b44d',stroke:'#fff1bd',strokeWidth:3})
      .setPosition(0,40).addChildTo(this.overlay);
    Label({text:'START',fontSize:34,fill:'#30200e',fontWeight:'bold'}).addChildTo(button);
    button.setInteractive(true); button.on('pointstart',function(){self.startGame();});
  },

  createPortraitControls:function(){
    var self=this;
    this.padCenter={x:360,y:910};
    CircleShape({radius:170,fill:'rgba(255,255,255,.06)',stroke:'rgba(255,255,255,.22)',strokeWidth:3})
      .setPosition(this.padCenter.x,this.padCenter.y).addChildTo(this.uiLayer);
    var defs=[
  {text:'▲',x:360,y:775, dx:0, dy:-1},
  {text:'▼',x:360,y:1045,dx:0, dy:1},
  {text:'◀',x:225,y:910, dx:-1,dy:0},
  {text:'▶',x:495,y:910, dx:1, dy:0}
    ];
    defs.forEach(function(d){
      var b=CircleShape({radius:66,fill:'rgba(255,255,255,.16)',stroke:'rgba(255,255,255,.45)',strokeWidth:3})
        .setPosition(d.x,d.y).addChildTo(self.uiLayer); b.setInteractive(true);
      Label({text:d.text,fontSize:42,fill:'#fff',fontWeight:'bold'}).addChildTo(b);
      b.on('pointstart',function(){if(self.state==='thinking')self.tryGridStep(d.dx,d.dy);});
    });
  },
  pointerStart:function(e) {},
  pointerMove:function(e) {},
  updateJoystick:function(px,py) {},
  releaseJoystick:function(){this.joyActive=false;this.moveX=0;this.moveY=0;this.joyBase.hide();this.joyKnob.hide();},

  startGame:function(){
    SoundManager.play('selectSound');
    if(this.overlay){this.overlay.remove();this.overlay=null;}
    this.state='waiting'; this.timer=500; this.showMessage('READY','#fff');
  },

  boardKey:function(x,y){return x+','+y;},
  insideBoard:function(x,y){return x>=0&&x<BOARD_N&&y>=0&&y<BOARD_N;},
  neighborsOf:function(x,y){return [[x-1,y],[x+1,y],[x,y-1],[x,y+1]];},
  getGroup:function(sx,sy){
    var color=this.board[sy][sx],stones=[],liberties={},visited={},stack=[[sx,sy]];
    while(stack.length){var p=stack.pop(),x=p[0],y=p[1],k=this.boardKey(x,y);if(visited[k])continue;visited[k]=true;stones.push({x:x,y:y});var ns=this.neighborsOf(x,y);for(var i=0;i<ns.length;i++){var nx=ns[i][0],ny=ns[i][1];if(!this.insideBoard(nx,ny))continue;var v=this.board[ny][nx];if(v===null)liberties[this.boardKey(nx,ny)]=true;else if(v===color&&!visited[this.boardKey(nx,ny)])stack.push([nx,ny]);}}
    return {stones:stones,libertyCount:Object.keys(liberties).length};
  },
  removeCapturedGroup:function(group){
    for(var i=0;i<group.stones.length;i++){var p=group.stones[i],k=this.boardKey(p.x,p.y),sp=this.stoneMap[k];this.board[p.y][p.x]=null;delete this.stoneMap[k];if(sp){var n=this.stones.indexOf(sp);if(n>=0)this.stones.splice(n,1);sp.tweener.clear().to({scaleX:1.35,scaleY:1.35,alpha:0},180).call((function(o){return function(){o.remove();};})(sp));}}
  },
  placeGoStone:function(move,sprite){
    var x=move.x,y=move.y,color=move.color,k=this.boardKey(x,y),old=this.stoneMap[k];if(old){var oi=this.stones.indexOf(old);if(oi>=0)this.stones.splice(oi,1);old.remove();}
    this.board[y][x]=color;this.stoneMap[k]=sprite;this.stones.push(sprite);
    var enemy=color==='B'?'W':'B',checked={},ns=this.neighborsOf(x,y);
    for(var i=0;i<ns.length;i++){var nx=ns[i][0],ny=ns[i][1];if(!this.insideBoard(nx,ny)||this.board[ny][nx]!==enemy)continue;var g=this.getGroup(nx,ny),gk=this.boardKey(g.stones[0].x,g.stones[0].y);if(checked[gk])continue;for(var j=0;j<g.stones.length;j++)checked[this.boardKey(g.stones[j].x,g.stones[j].y)]=true;if(g.libertyCount===0)this.removeCapturedGroup(g);}
    if(this.board[y][x]===color){var own=this.getGroup(x,y);if(own.libertyCount===0)this.removeCapturedGroup(own);}
  },

  rayEnd:function(cx,cy,dx,dy){
    var best=null,bestD=Infinity,blockR=STONE_R;
    for(var i=0;i<this.stones.length;i++){
      var q=this.stones[i],aligned=(dx!==0&&Math.abs(q.y-cy)<GRID*.28&&(q.x-cx)*dx>0)||(dy!==0&&Math.abs(q.x-cx)<GRID*.28&&(q.y-cy)*dy>0);
      var d=dx!==0?Math.abs(q.x-cx):Math.abs(q.y-cy);if(aligned&&d<bestD){best=q;bestD=d;blockR=STONE_R;}
    }
    if(this.enemy){var e=this.enemy,ea=(dx!==0&&Math.abs(e.y-cy)<GRID*.28&&(e.x-cx)*dx>0)||(dy!==0&&Math.abs(e.x-cx)<GRID*.28&&(e.y-cy)*dy>0);var ed=dx!==0?Math.abs(e.x-cx):Math.abs(e.y-cy);if(ea&&ed<bestD){best=e;bestD=ed;blockR=ENEMY_R;}}
    if(best) {
		  // 敵に当たった場合は、敵自身を爆風範囲に含める
		  if (best === this.enemy) {
		    return {
		      x: best.x,
		      y: best.y
		    };
		  }    	
    	return{
    		x:best.x-dx*(blockR+4),
    		y:best.y-dy*(blockR+4)
    	};
    }
    return{x:dx<0?BOARD_LEFT:(dx>0?BOARD_LEFT+BOARD_SIZE:cx),y:dy<0?BOARD_TOP:(dy>0?BOARD_TOP+BOARD_SIZE:cy)};
  },
  computeBlast:function(x,y){
    var l=this.rayEnd(x,y,-1,0),r=this.rayEnd(x,y,1,0),u=this.rayEnd(x,y,0,-1),d=this.rayEnd(x,y,0,1);
    return {left:l.x,right:r.x,top:u.y,bottom:d.y,cx:x,cy:y};
  },

  prepareNext:function(){
    if(this.moveIndex>=KIFU.length){this.finishGame();return;}
    if(this.enemyNeedsSpawn)this.spawnEnemy();
    var m=KIFU[this.moveIndex],p=gridToWorld(m.x,m.y);
    this.target={move:m,x:p.x,y:p.y,blast:null};
    this.stepsLeft=STEPS_PER_TURN;
    this.playerStepInTurn=0;
    this.state='thinking'; this.releaseJoystick();
  },
  updateStepsLabel:function(){},
  showStepCountdown:function(number){
    var label=Label({
      text:String(number),
      fontSize:150,
      fill:'#ffffff',
      fontWeight:'bold',
      stroke:'#2a160d',
      strokeWidth:10
    }).setPosition(BOARD_LEFT+BOARD_SIZE/2,BOARD_TOP+BOARD_SIZE/2).addChildTo(this.uiLayer);
    label.alpha=0;
    label.scaleX=.45; label.scaleY=.45;
    label.tweener
      .to({alpha:1,scaleX:1.15,scaleY:1.15},70,'easeOutQuad')
      .to({alpha:0,scaleX:1.45,scaleY:1.45},210,'easeInQuad')
      .call(function(){label.remove();});
  },
  lockAndDrop:function(skipEnemyMove){
    if(this.state!=='thinking')return;
    if(!skipEnemyMove)this.moveEnemyTowardPlayer();
    if(this.state==='dying')return;
    this.releaseJoystick(); this.state='locked'; this.timer=140;
  },
  makeWarning:function(b){
    this.clearWarning();
    var h=RectangleShape({width:b.right-b.left,height:5,fill:'rgba(255,210,70,.58)',stroke:null})
      .setPosition((b.left+b.right)/2,b.cy).addChildTo(this.effectLayer);
    var v=RectangleShape({width:5,height:b.bottom-b.top,fill:'rgba(255,210,70,.58)',stroke:null})
      .setPosition(b.cx,(b.top+b.bottom)/2).addChildTo(this.effectLayer);
    var mark=CircleShape({radius:STONE_R*0.9,fill:'rgba(255,100,30,.18)',stroke:'#ffd34f',strokeWidth:3})
      .setPosition(b.cx,b.cy).addChildTo(this.effectLayer);
    [h,v,mark].forEach(function(o){o.alpha=.25;o.tweener.clear().to({alpha:.9},230).to({alpha:.25},230).setLoop(true);});
    this.warningParts=[h,v,mark];
  },
  clearWarning:function(){for(var i=0;i<this.warningParts.length;i++){this.warningParts[i].tweener.clear();this.warningParts[i].remove();}this.warningParts=[];},

  beginDrop:function(){
    var self=this,t=this.target; this.clearWarning(); this.releaseJoystick(); this.state='dropping';
    var stone=Stone(t.move.color).setPosition(t.x,t.y-170).addChildTo(this.stoneLayer);
    stone.scaleX=1.5;stone.scaleY=1.5;stone.alpha=.7;this.fallingStone=stone;
    stone.tweener.clear().to({y:t.y,scaleX:1,scaleY:1,alpha:1},DROP_MS,'easeInQuad').call(function(){self.landStone();});
  },

  landStone:function(){
    var t=this.target;
    if(this.fallingStone)this.fallingStone.remove();
    var placed=Stone(t.move.color).setPosition(t.x,t.y).addChildTo(this.stoneLayer); this.fallingStone=null;
    SoundManager.play('stoneSound');
    this.placeGoStone(t.move,placed);
    t.blast=this.computeBlast(t.x,t.y);
    this.startBlast();
  },

  createFireLine:function(x1,y1,x2,y2){var g=DisplayElement().addChildTo(this.blastLayer),len=Math.max(Math.abs(x2-x1),Math.abs(y2-y1)),n=Math.max(1,Math.ceil(len/(FIRE_SPRITE_SIZE*.72)));for(var i=0;i<=n;i++){var t=i/n;FireTile().setPosition(x1+(x2-x1)*t,y1+(y2-y1)*t).addChildTo(g);}return g;},
  startBlast:function(){var b=this.target.blast,h=this.createFireLine(b.left,b.cy,b.right,b.cy),v=this.createFireLine(b.cx,b.top,b.cx,b.bottom);h.alpha=1;v.alpha=1;this.activeBlasts.push({shapeH:h,shapeV:v,area:b,remaining:BLAST_MS,armed:false,armDelay:BLAST_ARM_MS});this.moveIndex++;this.target=null;this.state='settling';this.timer=SETTLE_MS;},
  clearAllBlasts:function(){
    for(var i=0;i<this.activeBlasts.length;i++){
      this.activeBlasts[i].shapeH.remove();
      this.activeBlasts[i].shapeV.remove();
    }
    this.activeBlasts=[];
  },

  updateBlasts:function(deltaTime){
    for(var i=this.activeBlasts.length-1;i>=0;i--){
      var blast=this.activeBlasts[i];
      blast.remaining-=deltaTime;
      if(!blast.armed){ blast.armDelay-=deltaTime; if(blast.armDelay<=0)blast.armed=true; }
      if(blast.armed&&this.playerInBlastArea(blast.area)){ this.beginDeath('BLASTED!'); return; }
      if(blast.armed&&this.enemyInBlastArea(blast.area))this.defeatEnemy();
      if(blast.remaining<=0){
        blast.shapeH.remove(); blast.shapeV.remove();
        this.activeBlasts.splice(i,1);
      } else if(blast.remaining<350){
        var a=Math.max(0,blast.remaining/350);
        blast.shapeH.alpha=a*.48; blast.shapeV.alpha=a*.48;
      }
    }
  },

  playerInBlastArea:function(b){
    var x=this.player.x,y=this.player.y,r=PLAYER_R;
    var inH=(x+r>=b.left && x-r<=b.right && Math.abs(y-b.cy)<=BLAST_HALF+r);
    var inV=(y+r>=b.top && y-r<=b.bottom && Math.abs(x-b.cx)<=BLAST_HALF+r);
    return inH||inV;
  },

  showMessage:function(text,color){
    var label=Label({text:text,fontSize:48,fill:color,fontWeight:'bold',stroke:'#2a160d',strokeWidth:6})
      .setPosition(SCREEN_W/2,805).addChildTo(this.uiLayer);
    label.alpha=0;label.scaleX=.7;label.scaleY=.7;
    label.tweener.to({alpha:1,scaleX:1.08,scaleY:1.08},100).to({scaleX:1,scaleY:1},90).wait(350).to({alpha:0,y:68},220).call(function(){label.remove();});
  },

  switchPlayerToHitSprite:function(){
    if(!this.player)return;var old=this.player,hit=PlayerHit().setPosition(old.x,old.y).addChildTo(this.effectLayer);old.remove();this.player=hit;
  },
  beginDeath:function(reason){
    if(this.state==='dying'||this.state==='ended')return;
    this.clearWarning(); this.state='dying'; this.releaseJoystick();
    this.deathReason=reason||'BLASTED!';
    if(this.deathReason==='BLASTED!')this.switchPlayerToHitSprite();
    this.player.tweener.clear();
    // 待たずに即ゲームオーバー表示
    this.state = 'ended';
    this.showResult('GAME OVER');
    SoundManager.play('gameOverSound');
  },
    finishGame:function(){SoundManager.play('gameClearSound');this.clearWarning();this.clearAllBlasts();this.state='ended';this.releaseJoystick();this.showResult('CLEAR!');},
  showResult:function(title){
    var self=this,panel=RectangleShape({width:285,height:280,fill:'rgba(20,15,10,.92)',stroke:'#e8b44d',strokeWidth:4})
      .setPosition(SCREEN_W/2,1010).addChildTo(this.uiLayer);
    Label({text:title,fontSize:36,fill:title==='CLEAR!'?'#75f2ba':'#ff7262',fontWeight:'bold'}).setPosition(0,-78).addChildTo(panel);
    Label({text:this.moveIndex+' 手',fontSize:25,fill:'#fff',lineHeight:1.35}).setPosition(0,-5).addChildTo(panel);
    var retry=RectangleShape({width:205,height:58,fill:'#e8b44d',stroke:'#fff1bd',strokeWidth:3}).setPosition(0,88).addChildTo(panel);
    Label({text:'RETRY',fontSize:26,fill:'#30200e',fontWeight:'bold'}).addChildTo(retry);
    retry.setInteractive(true);retry.on('pointstart',function(){self.exit('main');});
  },

  spawnEnemy:function(){
    var a=[];
    for(var y=0;y<BOARD_N;y++)for(var x=0;x<BOARD_N;x++){
      if(!(x===0||y===0||x===BOARD_N-1||y===BOARD_N-1))continue;
      var p=gridToWorld(x,y); if(this.collidesStone(p.x,p.y)||(x===this.playerGridX&&y===this.playerGridY))continue;
      a.push({x:x,y:y,d:Math.abs(x-this.playerGridX)+Math.abs(y-this.playerGridY)});
    }
    a.sort(function(q,r){return r.d-q.d;}); var pool=a.slice(0,Math.min(8,a.length)); if(!pool.length)return;
    var c=pool[Math.floor(Math.random()*pool.length)],p=gridToWorld(c.x,c.y);
    this.enemy=Enemy().setPosition(p.x,p.y).addChildTo(this.effectLayer);
    this.enemyGridX=c.x;this.enemyGridY=c.y;this.enemyNeedsSpawn=false;
  },
  findEnemyNextStepByBFS:function(){
    if(!this.enemy)return null;
    var sx=this.enemyGridX,sy=this.enemyGridY,gx=this.playerGridX,gy=this.playerGridY;
    if(sx===gx&&sy===gy)return{x:sx,y:sy};
    var queue=[{x:sx,y:sy}],head=0,visited={},previous={};
    var startKey=this.boardKey(sx,sy),goalKey=this.boardKey(gx,gy);
    visited[startKey]=true;
    var dirs=[[0,-1],[-1,0],[1,0],[0,1]];
    while(head<queue.length){
      var cur=queue[head++],curKey=this.boardKey(cur.x,cur.y);
      if(curKey===goalKey)break;
      for(var i=0;i<dirs.length;i++){
        var nx=cur.x+dirs[i][0],ny=cur.y+dirs[i][1];
        if(!this.insideBoard(nx,ny))continue;
        var key=this.boardKey(nx,ny);if(visited[key])continue;
        if(!(nx===gx&&ny===gy)&&this.board[ny][nx]!==null)continue;
        visited[key]=true;previous[key]=curKey;queue.push({x:nx,y:ny});
      }
    }
    if(!visited[goalKey])return null;
    var stepKey=goalKey;
    while(previous[stepKey]&&previous[stepKey]!==startKey)stepKey=previous[stepKey];
    var parts=stepKey.split(',');return{x:parseInt(parts[0],10),y:parseInt(parts[1],10)};
  },
  moveEnemyTowardPlayer:function(){
    if(!this.enemy)return;
    var next=this.findEnemyNextStepByBFS();if(!next)return;
    if(next.x===this.enemyGridX&&next.y===this.enemyGridY){this.beginDeath('CAUGHT!');return;}
    this.enemyGridX=next.x;this.enemyGridY=next.y;
    var p=gridToWorld(next.x,next.y),self=this;
    this.enemy.tweener.clear().to({x:p.x,y:p.y},ENEMY_STEP_MS,'easeOutQuad').call(function(){
      if(self.enemyGridX===self.playerGridX&&self.enemyGridY===self.playerGridY)self.beginDeath('CAUGHT!');
    });
  },
  enemyInBlastArea:function(b){
    if(!this.enemy)return false;var x=this.enemy.x,y=this.enemy.y,r=ENEMY_R;
    return (x+r>=b.left&&x-r<=b.right&&Math.abs(y-b.cy)<=BLAST_HALF+r)||(y+r>=b.top&&y-r<=b.bottom&&Math.abs(x-b.cx)<=BLAST_HALF+r);
  },
  defeatEnemy:function(){
    if(!this.enemy)return;SoundManager.play('enemyHitSound'); var old=this.enemy,hit=EnemyHit().setPosition(old.x,old.y).addChildTo(this.effectLayer);old.remove();
    this.enemy=null;this.enemyGridX=-1;this.enemyGridY=-1;this.enemyNeedsSpawn=true;
    hit.tweener.clear().wait(220).to({alpha:0},180).call(function(){hit.remove();});
  },
  collidesStone:function(nx,ny){
    var minD=PLAYER_R+STONE_R*.93;
    for(var i=0;i<this.stones.length;i++)if(distance(nx,ny,this.stones[i].x,this.stones[i].y)<minD)return true;
    return false;
  },
  getStepDirection:function(app){
    var key=app.keyboard;
    var dx=0,dy=0;
    if(key.getKeyDown('left')||key.getKeyDown('a'))dx=-1;
    else if(key.getKeyDown('right')||key.getKeyDown('d'))dx=1;
    else if(key.getKeyDown('up')||key.getKeyDown('w'))dy=-1;
    else if(key.getKeyDown('down')||key.getKeyDown('s'))dy=1;
    return {dx:dx,dy:dy};
  },
  tryGridStep:function(dx,dy){
    if(this.stepMoving||(!dx&&!dy))return;
    var gx=this.playerGridX+dx,gy=this.playerGridY+dy;
    if(gx<0||gx>=BOARD_N||gy<0||gy>=BOARD_N)return;
    var p=gridToWorld(gx,gy);
    if(this.collidesStone(p.x,p.y))return;
    var self=this;
    this.stepMoving=true;
    this.playerGridX=gx; this.playerGridY=gy;this.stepsLeft--; this.showStepCountdown(this.stepsLeft);
    this.player.tweener.clear().to({x:p.x,y:p.y},STEP_MS,'easeOutQuad').call(function(){
      self.stepMoving=false;
      self.playerStepInTurn++;

      // 1歩目・2歩目では敵も1歩進む。3歩目では敵は動かない。
      if(self.playerStepInTurn<=2){
        self.moveEnemyTowardPlayer();
      }

      if(self.state!=='dying'&&self.stepsLeft<=0)self.lockAndDrop(true);
    });
  },
  updatePlayer:function(app){
    if(this.state!=='thinking'||this.stepsLeft<=0||this.stepMoving)return;
    var d=this.getStepDirection(app);
    if(d.dx!==0||d.dy!==0)this.tryGridStep(d.dx,d.dy);
  },
  update:function(app){
    if(this.state==='thinking')this.updatePlayer(app);
    if(this.state!=='dying')this.updateBlasts(app.deltaTime);
    if(this.state==='ended'||this.state==='intro'||this.state==='dropping')return;
    this.timer-=app.deltaTime;
    if(this.state==='waiting'&&this.timer<=0)this.prepareNext();
    else if(this.state==='thinking'){
    } else if(this.state==='locked'&&this.timer<=0){this.beginDrop();}
    else if(this.state==='settling'&&this.timer<=0)this.prepareNext();
  }
});

phina.main(function(){
  var app = GameApp({
    query: '#game',
    width: SCREEN_W,
    height: SCREEN_H,
    startLabel: 'main',
    fit: true,
    fps: 60,

    assets: {
      image: {
        playerImage: 'player.png',
        playerHitImage: 'player2.png',
        enemyImage: 'enemy.png',
        enemyHitImage: 'enemy2.png',
        fireImage: 'fire.png'
      },
      sound: {
        selectSound: 'select.wav',
        stoneSound: 'stone.wav',
        gameOverSound: 'gameOver.wav',
        gameClearSound: 'gameclear.wav',
        enemyHitSound: 'enemyHit.wav'
      }
    }
  });

  app.run();
});
