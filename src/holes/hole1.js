export const hole = {
  "name": "Sunny Lane",
  "par": 3,
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
      "piece": "bump-walls"
    },
    {
      "move": "turnLeft",
      "piece": "corner"
    },
    {
      "move": "forward",
      "piece": "straight"
    },
    {
      "move": "hole",
      "piece": "hole-round"
    }
  ],
  "decorations": [
    {
      "piece": "flag-green",
      "x": 2,
      "z": -1
    },
    {
      "piece": "windmill",
      "x": 3,
      "z": -4,
      "rotationSteps": 1
    }
  ]
};
