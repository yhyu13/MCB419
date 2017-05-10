This is the final project of MCB419 based on HW4 & HW13, which are bacteria kinesis and neural network reinforcement learning (NNRL). I call it "Dodge, Feast Temperature, and Electric Fence". They are the four elements of the enviornment that I built for the agent. Let's see what it can do!

Run/Click/Download "final project.html" to check out the latest version.

Introduction

This introduction goes in a form of Q & A: 
1) Q: What is the goal, the inspiration, what does it build on (e.g., is it an extension of a previous hw assignment)? 
A: I'm always inspired by Q-learning because it reminds me that even a simple idea can be pwoerful. This project is based on a extension of HW13 (neural network reinforcement learning) and HW4 (bacteria kinesis on a vraious temperature gradient) 
2) Q: What general information processing principles will be incorporated? 
A: The agent has 12 sensors. Based on the fact that the agent is a circle (no rotation), there is are four sensors on the "north, south, west, and east" edges of the agent, and each one of them return two values -- the overall accumulation of the inverse of distances (so that values goes larger when pellets get closer) between the agent and green pellets and the same thing for the red pellets. There is one sensor called "wall" that returns the inverse of distance between the agent and the cloest wall. And there is one sensor for temperature. The rest two are a little bit tricky: they are called "close", which return the inverse of distances only for pellets within 100 distance threshold (such that the agent is able to better prioritize pellets that are close which it either cosume or dodge.)The agent has 5 actions: [up,down,left,right,stop] which correspond to [W, S, A, D, Space]. The agent moves at peak speed of 2.5 units per frame, and pellets usually move faster than the agent. The agent learns by neural network with Q-learning (credit to: "http://www.life.illinois.edu #BC8F8F/mcb/419/lib/deepqlearn.js" ) 
3) Q: What hypothesis or hypotheses do you plan to test? What data will you collect? What comparisons will you make? 
A: The agent chases rewards and avoids pain, which means it shall stay in high temperature region while consume good(green) pellets and dodge bad(red) pellets (elective option: electric fence). The agent should have a trade-off/combination between staying in high temperature and chase green pellets. To evaluate the performance of the agent, the mean/std of energy, the mean/std of comsuption of bad pellets, and the mean/std of time stays in high temperature region will be collected. I will compare with 'keyboard', 'randAction', and 'traning'. 
4) Q: What is your measure of success for the project? 
A: It used be: Whether or not the agent can beat me hard!, which I thought is fun. Bur at this moment, I'd rather put my peer's opion in the first place becuase their voice is more honest and valuable than my self-fulfilment.

Model description / Methods
Describe specific implementation details here. It's important to have a well-defined specification before you start coding. Ideally you should make these detailed enough so that somebody else could read them and have enough information to recreate the model. (NOTE: you don't necessarily have to stick to these as the project develops. Most likely there will likely be changes, but this gives you a good starting point.)

1. Environment: key features of the environment
2. Agent(s): key features of the agent(s) in the model The agent uses Deep Q-learning to gain reward and avoid pain in a relatively complex enviroment.
3. Sensors: sensory system description; describe sensor types, number, coding, etc. (Described above)
4. Actions: motor system description; describe the actions that the agent can execute (Described above)
5. Controller: describe the controller architecture (e.g. FSM, neural network), what are the free/adjustable parameters? The number of hidden layers, the number of nuerons and activation fucntions, and leanring rate, batch size, etc.
6. Adaptation: will the system evolve or learn to improve performance? If so, how. The agent will first collect enough experience. Then randomly retrive those experience (DeepMind calls it dream?) and try to avoid actions that leads lower reward and excute actions that obtain gains. Finally, through ~100 iterations, the agent shall behave better than a human player.
7. Multi-agent interactions: describe interactions between agents if relevant (communication, predator-prey, mating, etc.) None
8. Graphical design: how do you plan to represent the above elements on the screen (Showed above: in progess)
9. User-interface: how will the user interact with the model Users can either play with keyboard or mouse. They also train network and either save or load existing networks.
10. Quantitative analysis: how will you present and analyze the results (tables, graphs, histograms) (The table below)
More ...anything else you want to add... It must be fun!XD

Javascript code organization
Given the specifications above, outline how you plan to organize your javascript code. What javascript objects and methods will you need to write? There isn't much to add but there are a lot to be modified (see comment in Js).

Progress Report / Milestones
How much have you already accomplished? What do you have left to do? Provide a brief list of key subgoals and target dates that will help move you toward your final goal.
