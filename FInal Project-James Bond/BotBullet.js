//------
// Bot & Enemy
//------

function Enemy(parms) {
  parms = parms || {};
  
  this.health = parms.health || 100;
  this.y = parms.y || random(50, height / 2);
  this.x = parms.x || random(50, width - 50);
  this.weapon = parms.weapon || "PISTOL";
  this.cfill = "red";
  this.fireRate = parms.fireRate || 100; // fire 1 time per 100 frames
  this.dia = parms.dia || 40;
}

Enemy.prototype.shoot = function() {
  targetX = bot.x;
  targetY = bot.y;
  myX = this.x;
  myY = this.y;
  
  dd = dist(targetX,targetY,myX,myY);
  bulletVx = bulletSpeed / dd * (targetX - myX);
  bulletVy = bulletSpeed / dd * (targetY - myY);
  
  bullet = new Bullet({bulletType:this.weapon,vx:bulletVx,vy:bulletVy,x:myX,y:myY,index:bullets.length,botx:bot.x,boty:bot.y});
  bullets.push(bullet); // add new bullet that has been shooted into the bullets[] array.
};

Enemy.prototype.update = function() {
  if (itick % this.fireRate === 0) {
    this.shoot();
  }
};

Enemy.prototype.display = function() {
  push();
  fill(this.cfill); 
  //translate(this.x, this.y);
  ellipse(this.x, this.y, this.dia, this.dia);
  /*
  textAlign(CENTER);
  text(nf(this.sns.left, 1, 2), -this.halfWidth, -6);
  text(nf(this.sns.right, 1, 2), this.halfWidth, -6);
  */
  pop();
};


//---------
// Bullet
//---------

// Bullet constructor

function Bullet(parms) {
  parms = parms || {};
  this.bulletType = parms.bulletType || "STONE";
  this.damage = 10;
  this.dia = 20;
  this.color = 'white';
  if (this.bulletType == "STONE") {
    this.damage = 10;
    this.dia = 20;
  } else if (this.bulletType == "PISTOL") {
    this.damage = 50;
    this.dia = 10;
    this.color = 'green';
  }
  this.vx = parms.vx || random(-1,1);
  this.vy = parms.vy || random(-1,1);
  this.x = parms.x || 0;
  this.y = parms.y || 0;
  this.indexInBulletArray = parms.index;
  this.angle = Math.atan((parms.boty-this.y) / (parms.botx-this.x));
}

Bullet.prototype.reset = function() {
  bullets.splice(this.index,1);
};

Bullet.prototype.display = function() {
  push();
  //noStroke();
	
  if (this.bulletType == "STONE") {
    fill(this.color);
    ellipse(this.x, this.y, this.dia, this.dia);
  } else if (this.bulletType == "PISTOL") {
    
    //print(angle);
    translate(this.x,this.y);
    rotate(this.angle);
    fill(this.color);
    ellipse(0, 0, this.dia, this.dia / 2);
  }
  pop();
};

Bullet.prototype.update = function() {
  this.x += this.vx;
  this.y += this.vy;
  if (this.x > width || this.x < 0 || this.y > height || this.y < 0) {
    this.reset();
  }
};

// Bot constructor
function Bot(parms) {
  parms = parms || {};
  
  this.halfWidth = parms.halfWidth || 10;
  this.y = parms.y || height - 150;
  this.x = parms.x || random(this.halfWidth, width-this.halfWidth);
  this.vx = 0; // x velocity
  this.vy = 0; // y velocity
  this.cfill = 'darkOrange';
  this.energy = 0;
  this.beingHitted = 0;

  this.controllerName = '';
  if (typeof parms.controller === 'string') {
    this.setController(parms.controller);
  }

  this.sns = {
    left: [0, 0], // RED, GREEN
    right: [0, 0], 
    up: [0, 0],
    down: [0,0],
    close: [0,0] // sns that is activated for pellets < 30 units.
  };

  // action values
  this.LEFT = 0;
  this.RIGHT = 1;
  this.STOP = 2;
  this.UP = 3;
  this.DOWN = 4;

  // reinforcement learning
  this.state = [0, 0];
  this.action = 0;
  this.reward = 0;
  this.nextState = [0, 0];
}

// a function for bot to consume pellets
Bot.prototype.consume = function() {
  // pellet consumption
  for (var i = 0; i < bullets.length; i++) {
    var dcheck = this.halfWidth + bullets[i].dia / 2;
      // comsume == TRUE in the case below
      if (dist(bullets[i].x,bullets[i].y,this.x,this.y) < dcheck){
      this.reward -= bullets[i].damage;
      this.beingHitted += 1;
      bullets[i].reset();
    }
  }
  this.energy += this.reward;
};

// a function for bot to update status every frame
Bot.prototype.update = function() {
  this.reward = 0;
  this.state = this.getSensorState();
  this.controller();
  
  // x-axis motion
  this.vx *= 0.98;
  this.vx = constrain(this.vx, -2.5, 2.5);
  this.x += this.vx;
  if (this.x < this.halfWidth) {
    this.x = this.halfWidth;
    this.vx = 0;
  } else if (this.x > width - this.halfWidth) {
    this.x = width - this.halfWidth;
    this.vx = 0;
  }
  
  // y-axis motion
  this.vy *= 0.98;
  this.vy = constrain(this.vy, -2.5, 2.5);
  this.y += this.vy;
  if (this.y < this.halfWidth) {
    this.y = this.halfWidth;
    this.vy = 0;
  } else if (this.y > height - this.halfWidth) {
    this.y = height - this.halfWidth;
    this.vy = 0;
  }
  
  this.consume();
  this.updateSensors();
  this.nextState = this.getSensorState();
  if (this.controllerName == "training") { 
    brain.backward(this.reward); 
  }
};

Bot.prototype.updateSensors = function() {
  this.sns.left = [0, 0];
  this.sns.right = [0, 0];
  this.sns.up = [0, 0];
  this.sns.down = [0, 0];
  this.sns.close = [0, 0];
  
  for (var i=0; i < bullets.length; i++) {
    this.sns.left[1] += 30.0 / dist(this.x - this.halfWidth, this.y, bullets[i].x, bullets[i].y);
    this.sns.right[1] += 30.0 / dist(this.x + this.halfWidth, this.y, bullets[i].x, bullets[i].y);
    this.sns.up[1] += 30.0 / dist(this.x, this.halfWidth + this.y, bullets[i].x, bullets[i].y);
    this.sns.down[1] += 30.0 / dist(this.x, this.y - this.halfWidth, bullets[i].x, bullets[i].y);
    if (dist(this.x, this.y, bullets[i].x, bullets[i].y) < 60){
    this.sns.close[1] += 30.0 / dist(this.x, this.y, bullets[i].x, bullets[i].y);
    }
  }
  
  for (var j=0; j < enemies.length; j++) {
    this.sns.left[0] += 30.0 / dist(this.x - this.halfWidth, this.y, enemies[j].x, enemies[j].y);
    this.sns.right[0] += 30.0 / dist(this.x + this.halfWidth, this.y, enemies[j].x, enemies[j].y);
    this.sns.up[0] += 30.0 / dist(this.x, this.halfWidth + this.y, enemies[j].x, enemies[j].y);
    this.sns.down[0] += 30.0 / dist(this.x, this.y - this.halfWidth, enemies[j].x, enemies[j].y);
    if (dist(this.x, this.y, enemies[j].x, enemies[j].y) < 60){
    this.sns.close[0] += 30.0 / dist(this.x, this.y, enemies[j].x, enemies[j].y);
    }
  }
};

Bot.prototype.getSensorState = function() {
  return this.sns.left.concat(this.sns.right).concat(this.sns.up).concat(this.sns.down).concat(this.sns.close);
};

Bot.prototype.display = function() {
  push();
  fill(this.cfill); 
  //translate(this.x, this.y);
  ellipse(this.x, this.y, 2*this.halfWidth, 2*this.halfWidth);
  /*
  textAlign(CENTER);
  text(nf(this.sns.left, 1, 2), -this.halfWidth, -6);
  text(nf(this.sns.right, 1, 2), this.halfWidth, -6);
  */
  pop();
};

Bot.prototype.setController = function(name) {
  this.controllerName = name;
  this.controller = this[name];
};

//-------------
// CONTROLLERS 
//-------------

Bot.prototype.randAction = function() {
  // pick a random action
  this.action = randint(0, 4);
  this.actionToMotor();
};

Bot.prototype.training = function() {
  this.action = brain.forward(this.state);
  this.actionToMotor();
};

Bot.prototype.testing = function() {
  this.action = brain.forward(this.state);
  this.actionToMotor();
};

Bot.prototype.keyboard = function() {
};

Bot.prototype.mouse = function() {
  mouse();
};

Bot.prototype.actionToMotor = function() {
  if (this.action == this.LEFT) {
    this.vx -= 2;
  } else if (this.action == this.RIGHT) {
    this.vx += 2;
  } else if (this.action == this.STOP) {
    this.vx = 0;
    this.vy = 0;
  } else if (this.action == this.UP) {
    this.vy += 2;
  } else if (this.action == this.DOWN) {
    this.vy -= 2;
  }
};
