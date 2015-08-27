var SpaceHipster = SpaceHipster || {};

SpaceHipster.GameState = {

  //initiate game settings
  init: function(currentlevel) {
    //use all the area, don't distort scale
    this.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
    
    //initiate physics system
    this.game.physics.startSystem(Phaser.Physics.ARCADE);
    
    //game constants
    this.PLAYER_SPEED = 200;
    this.BULLET_SPEED = -1000;
    
    

    this.numLevels = 3;
    this.currentlevel = currentlevel ? currentlevel : 1;
    console.log("Current Level:" + this.currentlevel); 

  },

  //load the game assets before the game starts
  preload: function() {
    this.load.image('space', 'assets/images/space.png');    
    this.load.image('player', 'assets/images/player.png');    
    this.load.image('bullet', 'assets/images/bullet.png');    
    this.load.image('enemyParticle', 'assets/images/enemyParticle.png');    
    this.load.spritesheet('yellowEnemy', 'assets/images/yellow_enemy.png', 50, 46, 3, 1, 1);   
    this.load.spritesheet('redEnemy', 'assets/images/red_enemy.png', 50, 46, 3, 1, 1);   
    this.load.spritesheet('greenEnemy', 'assets/images/green_enemy.png', 50, 46, 3, 1, 1);   
    this.load.text('level1', 'assets/data/level1.json');
    this.load.text('level2', 'assets/data/level2.json');    
    this.load.text('level3', 'assets/data/level3.json');
    this.load.audio('soundtrack', ['assets/audio/8bit-orchestra.mp3', 'assets/audio/8bit-orchestra.ogg']);
  },
  //executed after everything is loaded
  create: function() {

    console.log(SpaceHipster);

    //moving stars background
    this.background = this.add.tileSprite(0, 0, this.game.world.width, this.game.world.height, 'space');    
    
    this.background.autoScroll(0, 30);
    
    //player
    this.player = this.add.sprite(this.game.world.centerX, this.game.world.height - 50, 'player');
    this.player.anchor.setTo(0.5);
    this.game.physics.arcade.enable(this.player);
    this.player.body.collideWorldBounds = true;  
    
    //tilt controls - works
    // if (window.DeviceOrientationEvent) {
    //   window.addEventListener("deviceorientation", this.handleOrientation, true, this);
    // }
    
    //initiate player bullets and player shooting
    this.initBullets();
    this.shootingTimer = this.game.time.events.loop(Phaser.Timer.SECOND/5, this.createPlayerBullet, this);
    
    //initiate the enemies
    this.initEnemies();
    this.loadLevel();

    //play soundtrack
    this.soundtrack = this.add.audio('soundtrack');
    this.soundtrack.play();

  },
  update: function() {

    //check for overlap of bullets & enemys
    this.game.physics.arcade.overlap(this.playerBullets, this.enemies, this.damageEnemy, null, this);
    this.game.physics.arcade.overlap(this.enemyBullets, this.player, this.killPlayer, null, this);

    //player is not moving by default *Needs Conditional to disable IF we're using orintation API.
    // if (!SpaceHipster.device.iOS && !SpaceHipster.device.android) {
      this.player.body.velocity.x = 0;
    // }

    

    //listen to user input
    if(this.game.input.activePointer.isDown) {
      //get the location of the touch
      var targetX = this.game.input.activePointer.position.x;   
      
      //define the direction of the speed
      var direction = targetX >= this.player.x ? 1 : -1;   
      
      //move the player
      this.player.body.velocity.x = direction * this.PLAYER_SPEED; 
    }
  },
  
  //initiate the player bullets group
  initBullets: function(){
    this.playerBullets = this.add.group();
    this.playerBullets.enableBody = true;
  },
  
  //create or reuse a bullet - pool of objects
  createPlayerBullet: function(){
    var bullet = this.playerBullets.getFirstExists(false);
    
    //only create a bullet if there are no dead ones available to reuse
    if(!bullet) {
      bullet = new SpaceHipster.PlayerBullet(this.game, this.player.x, this.player.top);
      this.playerBullets.add(bullet);
    }
    else {
      //reset position
      bullet.reset(this.player.x, this.player.top);
    }
    
    //set velocity
    bullet.body.velocity.y = this.BULLET_SPEED;
    
  },
  initEnemies: function(){
  
    this.enemies = this.add.group();
    this.enemies.enableBody = true;

    this.enemyBullets = this.add.group();
    this.enemyBullets.enableBody = true;
    
    // var enemy = new SpaceHipster.Enemy(this.game, 100, 100, 'greenEnemy', 10, this.enemyBullets);
    // this.enemies.add(enemy);  
    
    // enemy.body.velocity.x = 100;
    // enemy.body.velocity.y = 50;
  },
  
  damageEnemy: function(bullet, enemy) {
    enemy.damage(1);
    
    bullet.kill();
  },
  
  //tilt Controls
  handleOrientation: function(e) {
    var x = e.gamma;

    SpaceHipster.GameState.player.body.velocity.x += x;
  },

  killPlayer: function() {
    this.player.kill();
    this.soundtrack.stop();
    this.game.state.start('GameState');
  },

  createEnemy: function(x, y, health, key, scale, speedX, speedY) {
    var enemy = this.enemies.getFirstExists(false);
    
    //only create a bullet if there are no dead ones available to reuse
    if(!enemy) {
      enemy = new SpaceHipster.Enemy(this.game, x, y, key, health, this.enemyBullets);
      this.enemies.add(enemy);
    }

      enemy.reset(x, y, health, key, scale, speedX, speedY);
  
  },

  loadLevel: function() {

    this.currentEnemyIndex = 0;

    this.levelData = JSON.parse(this.game.cache.getText('level' + this.currentlevel));

    //end of the level timer
    this.endofLevelTimer = this.game.time.events.add(this.levelData.duration * 1000, function(){
      console.log("level ended!");
      this.soundtrack.stop();
      if (this.currentlevel < this.numLevels) {
        this.currentlevel++;
      } else {
        this.currentlevel = 1;
      }

      this.game.state.start('GameState', true, false, this.currentlevel);

    }, this);


    this.scheduleNextEnemy();

  },
  
  scheduleNextEnemy: function() {
    var NextEnemy = this.levelData.enemies[this.currentEnemyIndex];

    if (NextEnemy) {
      var nextTime = 1000 * ( NextEnemy.time - (this.currentEnemyIndex == 0 ? 0 : this.levelData.enemies[this.currentEnemyIndex -1].time));
      this.NextEnemyTimer = this.game.time.events.add(nextTime, function(){
        this.createEnemy(NextEnemy.x * this.game.world.width, -100, NextEnemy.health, NextEnemy.key, NextEnemy.scale, NextEnemy.speedX, NextEnemy.speedY);

        this.currentEnemyIndex++;
        this.scheduleNextEnemy();
      }, this);
    }
  }
};