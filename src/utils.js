/** Generate a random integer between min and max. */
export function getRandomInt (min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Generate a random uniform number between min and max.  */
export function randomUniform(min, max) {
  return Math.random() * (max - min) + min;
}

/** Use Central Limit Theorem (CLT) with sample size 6 to efficiently approximate Gaussian. */
export function gaussianRand() {
  var rand = 0;

  for (var i = 0; i < 6; i += 1) {
    rand += Math.random();
  }

  return rand / 6;
}

/** Sample approximately Gaussian distributed samples in (start, end).  */
export function gaussianRandom(start, end) {
  return Math.floor(start + gaussianRand() * (end - start + 1));
}