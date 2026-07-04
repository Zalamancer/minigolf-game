export const hole = {
  "decorations": [
    {
      "piece": "windmill",
      "x": -3,
      "z": -3,
      "rotationSteps": 1
    },
    {
      "piece": "flag-blue",
      "x": 7,
      "z": -2,
      "rotationSteps": 0
    },
    {
      "piece": "crest",
      "x": 6,
      "z": 2,
      "rotationSteps": 2
    }
  ],
  "name": "Serpent's Gauntlet",
  "par": 5,
  "start": {
    "x": 0,
    "z": 0,
    "heading": "N"
  },
  "steps": [
    {
      "move": "forward",
      "piece": "straight"
    },
    {
      "move": "forward",
      "piece": "ramp"
    },
    {
      "move": "turnRight",
      "piece": "corner"
    },
    {
      "move": "forward",
      "piece": "bump-walls"
    },
    {
      "move": "forward",
      "piece": "straight"
    },
    {
      "move": "turnRight",
      "piece": "corner"
    },
    {
      "move": "forward",
      "piece": "gap"
    },
    {
      "move": "forward",
      "piece": "straight"
    },
    {
      "move": "turnLeft",
      "piece": "round-corner-a"
    },
    {
      "move": "forward",
      "piece": "straight"
    },
    {
      "move": "forward",
      "piece": "tunnel-narrow"
    },
    {
      "move": "turnLeft",
      "piece": "square-corner-a"
    },
    {
      "move": "forward",
      "piece": "straight"
    },
    {
      "move": "hole",
      "piece": "hole-round"
    }
  ]
};
