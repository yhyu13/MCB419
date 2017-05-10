// noprotect
//
// Q learning with neural nets
// credit to Prof. M. Nelson, Apr 2017
// Hang (Yohan) Yu, Apr 2017

var itick = 0;
var bot;
var pellets = [];
var brain;
var backgroundImage; // credit :Prof.M.Melson HW4:https://jsbin.com/neyulot/1/edit?js,output
var temperature = [];

var simModes = ['keyboard','mouse','randAction','training', 'testing'];
var modeSelector; // GUI element for selecting a controller
 
var slower = 2; // # times more slower than usual
var paused = true;
var expt = null;

var NSTEPS = 2000;
var NTRIALS = 50;
var NPELLETS = 12;

var EXPT_SPEEDUP = 500;
// varibel to tell whether or not we've trained network at least once (run series). Becuase brain.foward(bot.nextState) (which predict bot's next move) is not available in a brand new network.
var trained = false;

//---------
// Vector normalization fucntion
//---------
function normalize(arr) {
  var tol = 0;
  for (var i in arr) {tol += arr[i] * arr[i];}
  tol = Math.sqrt(tol);
  for (var j in arr) {arr[j] /= tol;}
  return arr;
}
    

//---------
// HW4 MakeBackgroundImage() & getTemperature(x,y)
//---------
function makeBackgroundImage() {
  backgroundImage = createImage(width, height);
  // sinusoidal variation
  for (var iy = 0; iy < height; iy++) {
    for (var ix = 0; ix < width; ix++) {

      var temp = 0.5 + 0.7 * Math.cos(0.03 * ix) * Math.sin(0.04 * iy);
      temp = Math.min(Math.max(temp, 0), 1);
      temperature.push(temp);
      var redVal = Math.floor(255 * temp);
      var blueVal = Math.floor(255 * (1 - temp));
      var greenVal = min(redVal, blueVal);
      backgroundImage.set(ix, iy, color(redVal, greenVal, blueVal));
    }
  }
  backgroundImage.updatePixels();
}

function getTemperature(x, y) {
  var ix = constrain(Math.floor(x), 0, width - 1);
  var iy = constrain(Math.floor(y), 0, height - 1);
  var idx = ix + width * iy;
  return temperature[idx];
}


//---------
// SETUP
//---------

function reset() {
	// reset bot
	bot.x = width / 2;
	bot.y = height - 100;
	bot.setController(modeSelector.value());
	bot.energy = 0;
  bot.badPellets = 0;

	// reset pellets
	pellets = [];
  for(var i = 0; i < NPELLETS;i++) {
    pellets.push(new Pellet());
  }

	// reset sim
	itick = 0;
	paused = true;
}

function resetBrain() {
	var num_inputs = 12; //  [leftRed, leftGreen, rightRed, rightGreen, upRed, upGreen, downRed, downGreen, closeGreen, closeRed, wall,temperature]
	var num_actions = 5; // Left/Right/Stop/Up/Down
	var temporal_window = 0; // amount of temporal memory. 0 = agent lives in-the-moment :)
	var network_size = temporal_window * (num_inputs + num_actions) + num_inputs;

  // Specify Neural Network Architecture
	var layer_defs = [];
	layer_defs.push({type:'input', out_sx:1, out_sy:1, out_depth:network_size});
  // ADD HIDDEN LAYER(S) HERE
  // ...
  layer_defs.push({type:'fc', num_neurons:20, activiation:'sigmoid'});
  
  // output layer:
	layer_defs.push({type:'regression', num_neurons: num_actions});

	// options for the learning algorithm (feel free to edit these)
	var opt = {};
	opt.temporal_window = temporal_window;
	opt.experience_size = NSTEPS * NTRIALS;
	opt.start_learn_threshold = 2000;
	opt.gamma = 0.95;
	opt.learning_steps_total = 60000;
	opt.learning_steps_burnin = 10000;
	opt.epsilon_min = 0.1;
	opt.epsilon_test_time = 0.0;
	opt.layer_defs = layer_defs;
	opt.tdtrainer_options = {learning_rate:0.001, momentum:0.0, batch_size: 50, l2_decay:0.001};

	brain = new deepqlearn.Brain(num_inputs, num_actions, opt);
}

function setup() {
	createCanvas(300, 300).parent('canvas');
  
  // make the background image (temperature map)
  makeBackgroundImage();
  
  // Create buttons/selectors/textWindow that stores neural network 
	createGUI();
	
  // Create a Bot
  bot = new Bot();
  
  // reset deepqlearn.Brain
	resetBrain();
	
  // reset scene
  reset();
}

//------------
// MAIN LOOP
//------------
function mouse() {
	// mouse light handler
	if (mouseIsPressed) {
		dx = mouseX - bot.x;
		dy = mouseY - bot.y;
    dd = sqrt(dx*dx + dy*dy);
    if (dd < 1) {
      bot.vx = 0;
      bot.vy = 0;
    } else {
      bot.vx += 5 * dx / dd;
      bot.vy += 5 * dy / dd;
    }
	}
}

function keyTyped() {
  if (key == 'n') {
    reset();
    togglePause();
  } else if (key == 'a') {
    bot.vx -= 5;
  } else if (key == 's') {
    bot.vy += 5;
  } else if (key == 'd') {
    bot.vx += 5;
  } else if (key == 'w') {
    bot.vy -= 5;
  } else if (key == ' ') {
    bot.vy = 0;
    bot.xy = 0;
  }
}

var n = 1;

function draw() {
	
  // show backgroundImage (temperature map)
  if (bot.temperatureReward !== 0.0){
    image(backgroundImage, 0, 0);
  } else {
    background(0);
  }
  
  if (bot.enableElectricWall) {
    //noStroke();
    fill('yellow');
    rect(0,0,width,5);
    rect(0,height-5,width,5);
    rect(0,0,5,height);
    rect(width-5,0,5,height);
  }
	for (var i=0; i<pellets.length; i++) {pellets[i].display();}
	bot.display();
	displayInfo();

	if (expt) {
		expt.update();
		expt.display();
		if (expt.isFinished()) {
			bot.setController(modeSelector.value());
			reset();
			expt = null;
		}
	} else {
		if (paused || itick >= NSTEPS) {
			select('#status').html('paused');
			noLoop();
		} else {
      
			if (n % slower === 0) {
        n = 1;
				simStep();
				//if (itick >= NSTEPS) break;
			} else {
        n += 1;
      }
		}
	}
}

function simStep() {
  itick++;
  for (var i=0; i<pellets.length; i++) {pellets[i].update();}
  bot.update();
}

//---------
// DISPLAY
//---------



function displayInfo() {
	push();
	textSize(14);
	noStroke();
	fill('white');
	textAlign(LEFT);
	text(bot.controllerName, 15, 30);
	textAlign(CENTER);
	text("energy = " + nf(bot.energy,2,2), width / 2, 30);
  textAlign(CENTER);
  text("hit by bad pellets = " + nf(bot.badPellets), width / 2, 45);
	textAlign(RIGHT);
	text(itick, width - 15, 30);
	pop();
}
//-------
// GUI
//-------
function createGUI() {
  
  // show the Q arry of the current state of bot
  myQ = createDiv("[LEFT, RIGHT, UP, DOWN, STOP]=>best action is: undefined");
  myQ.parent('myQ');

	// RESET BRAIN
	var qBtn = createButton('reset Brain').parent('#gui');
	qBtn.mousePressed(function() {
		resetBrain();
	});

	// CONTROLLER SELECTOR
	modeSelector = createSelect().parent('#gui');
	for (var i = 0; i < simModes.length; i++) {
		modeSelector.option(simModes[i]);
	}
	modeSelector.changed(function() {
		var val = this.value();
		bot.setController(val);
		if(val === "training") {brain.learning = true;}
		if(val === "testing")  {brain.learning = false;}
		reset();
		redraw();
	});

	// RESET
	var resetBtn = createButton('reset').parent('#gui');
	resetBtn.mousePressed(function() {
		reset();
		redraw();
	});

	// SINGLE STEP
	var stepBtn = createButton('single step').parent('#gui');
	stepBtn.mousePressed(function() {
		simStep();
		redraw();
	});

	// RUN/PAUSE
	var runBtn = createButton('run/pause').parent('#gui');
	runBtn.mousePressed(togglePause);

	// RUN SERIES
	var exptBtn = createButton('run series').parent('#gui');
	exptBtn.mousePressed(function() {
		expt = new Expt(EXPT_SPEEDUP);
		loop();
	});
  
  // credit: Prof.M.Nelson HW4:https://jsbin.com/neyulot/1/edit?js,output
  // faster input (controls number of simulation updates per screen refresh)
  var fasterLabel = createSpan(' slower:');
  fasterLabel.parent('#gui');
  var fasterInput = createInput(slower);
  fasterInput.parent('#gui');
  fasterInput.attribute('id', 'fasterInput'); // add 'id' so we can find it later
  fasterInput.style("width", "40px");
  fasterInput.input(function() {
    slower = this.value();
    redraw();
  });
  
  // ENABLE / DISABLE Electric Fence
  var wallSelect = createSelect().parent('#gui');
  wallSelect.option('Electric Fence Disable');
  wallSelect.option('Electric Fence Enable');
  
	wallSelect.changed(function() {
    var val = this.value();
    if (val === "Electric Fence Enable") {
      bot.enableElectricWall = true;
    } else {
      bot.enableElectricWall = false;
    }
    reset();
    redraw();
  });
  
  // ENABLE / DISABLE Electric Fence
  var sceneSelect = createSelect().parent('#gui');
  sceneSelect.option('Scene 1 - temperature reward high');
  sceneSelect.option('Scene 2 - temperature reward low');
  sceneSelect.option('Scene 3 - no temperature reward');
  
	sceneSelect.changed(function() {
    var val = this.value();
    if (val === "Scene 1 - temperature reward high") {
      bot.temperatureReward = 0.25;
    } else if (val === "Scene 2 - temperature reward low"){
      bot.temperatureReward = 0.05;
    } else {
      bot.temperatureReward = 0.0;
      bot.pelletsRewardMultipler = 1.0;
    }
    reset();
    redraw();
  });
  
	//-------
	// GUI2
	//-------

	// Save network
	var saveBtn = createButton('save network').parent('#gui2');
	saveBtn.mousePressed(function() {
	  var j = brain.value_net.toJSON();
	  var t = JSON.stringify(j);
	  select('#scene1').html(t);
	});

	// Load network
	var loadBtn = createButton('load network').parent('#gui2');
	loadBtn.mousePressed(function() {
	  var t = select('#scene1').html();
	  var j = JSON.parse(t);
	  brain.value_net.fromJSON(j);
	});
  
  //-------
	// GUI3
	//-------

	// Save network
	var saveBtn2 = createButton('save network').parent('#gui3');
	saveBtn2.mousePressed(function() {
	  var j = brain.value_net.toJSON();
	  var t = JSON.stringify(j);
	  select('#scene2').html(t);
	});

	// Load network
	var loadBtn2 = createButton('load network').parent('#gui3');
	loadBtn2.mousePressed(function() {
	  var t = select('#scene2').html();
	  var j = JSON.parse(t);
	  brain.value_net.fromJSON(j);
	});
  
  //-------
	// GUI4
	//-------

	// Save network
	var saveBtn3 = createButton('save network').parent('#gui4');
	saveBtn3.mousePressed(function() {
	  var j = brain.value_net.toJSON();
	  var t = JSON.stringify(j);
	  select('#scene3').html(t);
	});

	// Load network
	var loadBtn3 = createButton('load network').parent('#gui4');
	loadBtn3.mousePressed(function() {
	  var t = select('#scene3').html();
	  var j = JSON.parse(t);
	  brain.value_net.fromJSON(j);
	});

}

function togglePause() {
	paused = !paused;
	if (!paused) {
		select('#status').html('running');
		loop();
	}
}

//-------------
// EXPERIMENT
//------------

function Expt(speedup) {

	// run a set of trials for the currently selected controller
	// and enter stats in the data table

	this.done = false;
	this.itrial = 0;
	this.speedup = speedup;
	this.fitDat = [];

	reset();

	this.update = function() {

		// take n simulation steps
		var n = this.speedup;
		while (n--) {
			simStep();
			if (itick >= NSTEPS) break;
		}

		// update display
		this.display();

		if (itick >= NSTEPS) {
			// finished trial
			this.fitDat.push(bot.energy);
			reset();
			this.itrial++;
			if (this.itrial == NTRIALS) {
				// finished series
				var stats = calcArrayStats(this.fitDat);
				var buf = select('#table').html(); // get existing table data
				buf += "<tr>"; // add a new row
				buf += "<td>" + bot.controllerName + "</td>";
				buf += "<td>" + nf(stats.mean, 1, 2) + " (" + nf(stats.std, 1, 2) + ")" + "</td>";
				buf += "</tr>";
				select('#table').html(buf); // put it back in the table
        
        // The condition below indicates the network has been trained
        if (bot.controllerName == "training" && !trained) {
          trained = true;
        }
        
				this.done = true;
				reset();
			}
		}

	};

	this.display = function() {
		select('#status').html(bot.controllerName + " trial/tick: " + [this.itrial, itick]);
	};

	this.isFinished = function() {
		return this.done;
	};
}

//------------
// UTILITIES
//------------

function calcArrayStats(inputArray) {
	/**
	 ** calculates mean, standard deviation and standar error 
	 **
	 ** input: inputArray, an array of numbers
	 ** returns: {mean: <mean>, std: <standard deviation>, sem: <standard error>}
	 */
	var sum = 0;
	var sumSq = 0;
	var n = inputArray.length;
	for (var i = 0; i < n; i++) {
		sum += inputArray[i];
		sumSq += inputArray[i] * inputArray[i];
	}
	var variance = (sumSq - (sum * sum) / n) / (n - 1);
	return {
		mean: sum / n,
		std: Math.sqrt(variance),
		sem: Math.sqrt(variance / n)
	};
}

function randint(min,max) {
	// return a random integer N such that min <= N <= max
    return Math.floor(Math.random()*(max-min+1)+min);
}

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
  this.temperatureReward = 0.25;
  this.pelletsRewardMultipler = 1;


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
    wall: [0],
    temp: [0]
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
  // temperature reward/punishment
  this.reward += this.temperatureReward * (getTemperature(this.x,this.y) - 0.5);
  //print(getTemperature(this.x,this.y));
  
  // pellet consumption
  for (var i = 0; i < pellets.length; i++) {
    var dcheck = this.halfWidth + pellets[i].dia / 2;
      // comsume == TRUE in the case below
      if (dist(pellets[i].x,pellets[i].y,this.x,this.y) < dcheck){
      this.reward += this.pelletsRewardMultipler * pellets[i].value;
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
  this.vx = constrain(this.vx, -2.5, 2.5);
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
  this.vy = constrain(this.vy, -2.5, 2.5);
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
  var actionDict = {0: "LEFT", 1:"RIGHT", 2:"STOP", 3:"UP", 4:"DOWN"};
  if (this.controllerName == "training") {
    brain.backward(this.reward);
    
    if (trained){
      myQ.html(" [LEFT, RIGHT, UP, DOWN, STOP]=> Trained network, the best action is: " + actionDict[brain.forward(this.state)]);
    } else {
      myQ.html(" [LEFT, RIGHT, UP, DOWN, STOP]=> Brand new network, the best action is: " + actionDict[brain.forward(this.state)]);
    }
  }
  // Show best action in "testing" model as well
  if (this.controllerName == "testing") {
    // My code
    if (trained){
      myQ.html(" [LEFT, RIGHT, UP, DOWN, STOP]=>Trained network, best action is: " + actionDict[brain.forward(this.nextState)]);
    } else {
      myQ.html(" [LEFT, RIGHT, UP, DOWN, STOP]=> Brand new network, the best action is: " + actionDict[brain.forward(this.state)]);
    }
  }
};

Bot.prototype.updateSensors = function() {
  this.sns.left = [0, 0];
  this.sns.right = [0, 0];
  this.sns.up = [0, 0];
  this.sns.down = [0, 0];
  this.sns.close = [0, 0];
  this.sns.wall = [0];
  this.sns.temp = [0];
  
  this.sns.temp[0] += getTemperature(this.x,this.y);
  
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
  return normalize(this.sns.left.concat(this.sns.right).concat(this.sns.up).concat(this.sns.down).concat(this.sns.close).concat(this.sns.wall).concat(this.sns.temp));
};

Bot.prototype.display = function() {
  push();
  fill(this.cfill); 
  //translate(this.x, this.y);
  ellipse(this.x, this.y, 2*this.halfWidth, 2*this.halfWidth);
  
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
	//noStroke();
	fill(this.color);
	ellipse(this.x, this.y, this.dia, this.dia);
};

Pellet.prototype.reset = function() {
  
  this.dia = 10;
  this.color = (random() < 0.3) ? 'red' : 	'#7FFF00';  // red = bad (-1); green = good (+1)
  this.value = (this.color == 'red') ? -1 : 1;
  
  var xbuffer = (this.color == 'red') ? 10 : 10;  // provide safe zones from red pellets
  if (random() < 0.5) {
    // 50% goes through the screen vertical or horizontally
    if (random() < 0.5) {
      // 50% goes through the screen in either up or down (for horizontal pellets: left or right)
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
