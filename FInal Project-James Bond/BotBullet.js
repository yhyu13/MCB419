//------
// Bot
//------

// Bot constructor
function Bot(parms) {
  parms = parms || {};
  this.halfWidth = parms.halfWidth || 10;
  this.y = parms.y || height - 150;
  this.x = parms.x || random(this.halfWidth, width-this.halfWidth);
  this.vx = 0; // x velocity
  this.vy = 0;
  this.cfill = 'darkOrange';
  this.energy = 0;
  this.badPellets = 0;
  this.enableElectricWall = false;


  this.controllerName = '';
  if (typeof parms.controller === 'string') {
    this.setController(parms.controller);
  }

  this.sns = {
    left: [0, 0], // RED, GREEN
    right: [0, 0], 
    up: [0, 0],
    down: [0,0],
    close: [0,0], // sns that is activated for pellets < 30 units.
    wall: [0]
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
  for (var i = 0; i < pellets.length; i++) {
    var dcheck = this.halfWidth + pellets[i].dia / 2;
      // comsume == TRUE in the case below
      if (dist(pellets[i].x,pellets[i].y,this.x,this.y) < dcheck){
      this.reward += pellets[i].value;
      if (pellets[i].value < 0) {
        this.badPellets += 1;
      }
      pellets[i].reset();
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
  this.vx = constrain(this.vx, -5, 5);
  this.x += this.vx;
  if (this.x < this.halfWidth) {
    this.x = this.halfWidth;
    // punish hitting the wall
    if (this.enableElectricWall) {
      //this.vx = 10;
      this.reward -= 2 * this.halfWidth / min(this.x,this.y,width - this.x, height - this.y);
    }
  } else if (this.x > width - this.halfWidth) {
    this.x = width - this.halfWidth;
    // punish hitting the wall
    if (this.enableElectricWall) {
      //this.vx = -10;
      this.reward -= 2 * this.halfWidth / min(this.x,this.y,width - this.x, height - this.y);
    }
  }
  
  // y-axis motion
  this.vy *= 0.98;
  this.vy = constrain(this.vy, -5, 5);
  this.y += this.vy;
  if (this.y < this.halfWidth) {
    this.y = this.halfWidth;
    // punish hitting the wall
    if (this.enableElectricWall) {
      //this.vy = 10;
      this.reward -= 2 * this.halfWidth / min(this.x,this.y,width - this.x, height - this.y);
    }
  } else if (this.y > height - this.halfWidth) {
    this.y = height - this.halfWidth;
    // punish hitting the wall
    if (this.enableElectricWall) {
      //this.vy = -10;
      this.reward -= 2 * this.halfWidth / min(this.x,this.y,width - this.x, height - this.y);
    }
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
  this.sns.wall = [0];
  
  if (this.x - 0 < 50 || width - this.x < 50 || this.y - 0 < 50 || height - this.y < 50) {
    this.sns.wall[0] += 2 * this.halfWidth / min(this.x,this.y,width - this.x, height - this.y);
  }
  
  for (var i=0; i < pellets.length; i++) {
    var idx = (pellets[i].color == 'red') ? 0 : 1;
    this.sns.left[idx] += 30.0 / dist(this.x - this.halfWidth, this.y, pellets[i].x, pellets[i].y);
    this.sns.right[idx] += 30.0 / dist(this.x + this.halfWidth, this.y, pellets[i].x, pellets[i].y);
    this.sns.up[idx] += 30.0 / dist(this.x, this.halfWidth + this.y, pellets[i].x, pellets[i].y);
    this.sns.down[idx] += 30.0 / dist(this.x, this.y - this.halfWidth, pellets[i].x, pellets[i].y);
    if (dist(this.x, this.y, pellets[i].x, pellets[i].y) < 60){
    this.sns.close[idx] += 30.0 / dist(this.x, this.y, pellets[i].x, pellets[i].y);
    }
  }
};

Bot.prototype.getSensorState = function() {
  return this.sns.left.concat(this.sns.right).concat(this.sns.up).concat(this.sns.down).concat(this.sns.close).concat(this.sns.wall);
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

Bot.prototype.actionToMotor = function() {
  if (this.action == this.LEFT) {
    this.vx -= 5;
  } else if (this.action == this.RIGHT) {
    this.vx += 5;
  } else if (this.action == this.STOP) {
    this.vx = 0;
    this.vy = 0;
  } else if (this.action == this.UP) {
    this.vy += 5;
  } else if (this.action == this.DOWN) {
    this.vy -= 5;
  }
};


//---------
// Pellet
//---------

// Pellet constructor

function Pellet() {
    this.reset();
}

Pellet.prototype.display = function() {
	noStroke();
	fill(this.color);
	ellipse(this.x, this.y, this.dia, this.dia);
};

Pellet.prototype.reset = function() {
  
  this.dia = 10;
  this.color = (random() < 0.3) ? 'red' : 'green';  // red = bad (-1); green = good (+1)
  this.value = (this.color == 'red') ? -1 : 1;
  
  var xbuffer = (this.color == 'red') ? 10 : 10;  // provide safe zones from red pellets
  if (random() < 0.5) {
    if (random() < 0.5) {
      this.x = random(xbuffer, width - xbuffer);
      this.y = 10;
      this.vy = random(2,4);
      this.vx = random(-1,1);
    } else {
      this.x = random(xbuffer, width - xbuffer);
      this.y = height - 10;
      this.vy = -random(2,4);
      this.vx = random(-1,1);
    }
  } else {
    if (random() < 0.5) {
      this.x = 10;
      this.y = random(xbuffer, width - xbuffer);
      this.vy = random(-1,1);
      this.vx = random(2,4);
    } else {
      this.x = width - 10;
      this.y = random(xbuffer, width - xbuffer);
      this.vy = random(-1,1);
      this.vx = -random(2,4);
    }
  }
};

Pellet.prototype.update = function() {
	this.y += this.vy;
	if (this.y > height || this.y < 0) this.reset();
  this.x += this.vx;
	if (this.x > width || this.x < 0) this.reset();
};
