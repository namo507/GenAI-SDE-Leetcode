import type { LabDefinition, LabParameters } from "./types";

export function gradientTrajectory(p: LabParameters) {
  let x = p.start!;
  const rows = [{ iteration: 0, x, loss: (x - 2) ** 2, gradient: 2 * (x - 2) }];
  for (let i = 1; i <= p.steps!; i++) {
    x -= p.rate! * 2 * (x - 2);
    rows.push({ iteration: i, x, loss: (x - 2) ** 2, gradient: 2 * (x - 2) });
  }
  return rows;
}

const fmt = (n: number) => n !== 0 && (Math.abs(n) < 1e-5 || Math.abs(n) >= 1e7)
  ? n.toExponential(3)
  : n.toLocaleString("en-US", { maximumSignificantDigits: 5 });

export const foundationLabs: LabDefinition[] = [{
  id: "gradient-descent",
  title: "Find the bottom: gradient descent",
  domain: "deep-learning",
  roles: ["sde", "data-scientist", "ml-engineer", "genai-engineer"],
  minutes: 15,
  summary: "Choose a step size and watch a parameter approach, jump over or move away from the same minimum. Discover why a bigger update can make learning worse.",
  topicIds: ["w09-d01-backpropagation", "w07-d02-linear-logistic-regression", "w01-d05-derivatives-chain-rule"],
  controls: [
    { key: "start", label: "Starting parameter", min: -6, max: 8, step: 1, defaultValue: 8, help: "The target parameter is 2. Starting exactly there makes the gradient zero." },
    { key: "rate", label: "Learning rate", min: 0, max: 1.5, step: 0.05, defaultValue: 0.2, help: "Update x by subtracting learning rate × gradient. These stability thresholds apply to this quadratic only." },
    { key: "steps", label: "Number of updates", min: 1, max: 12, step: 1, defaultValue: 6, help: "Keep the same step size for every update. No randomness or real training service is involved." },
  ],
  presets: [
    { id: "steady", label: "Small, steady steps", description: "A rate of 0.2 shrinks distance by a factor of 0.6 per update.", values: { start: 8, rate: 0.2, steps: 6 } },
    { id: "overshoot", label: "Overshoot and still converge", description: "A rate of 0.75 crosses the minimum each time, but halves the distance.", values: { start: 8, rate: 0.75, steps: 6 } },
    { id: "oscillate", label: "Never get closer", description: "At a rate of 1, the two endpoints keep swapping.", values: { start: 8, rate: 1, steps: 6 } },
    { id: "diverge", label: "Too big to learn", description: "At a rate of 1.25 the distance grows, even though the derivative is correct.", values: { start: 8, rate: 1.25, steps: 6 } },
    { id: "stationary", label: "The stationary exception", description: "Starting at the minimum keeps the parameter still, even with a normally unstable rate.", values: { start: 2, rate: 1.25, steps: 6 } },
  ],
  evaluate(p) {
    const trajectory = gradientTrajectory(p);
    const first = trajectory[0]!;
    const last = trajectory.at(-1)!;
    return {
      metrics: [
        { label: "Final parameter", value: fmt(last.x), detail: "The minimum of (x − 2)² is at x = 2." },
        { label: "Final loss", value: fmt(last.loss), detail: "Squared distance from the minimum, not accuracy or hiring readiness." },
        { label: "Distance multiplier", value: fmt(Math.abs(1 - 2 * p.rate!)), detail: "Each update multiplies distance by |1 − 2 × learning rate|." },
      ],
      table: { caption: "Every gradient update", columns: ["Update", "Parameter x", "Loss (x − 2)²", "Gradient 2(x − 2)"], rows: trajectory.map((r) => [r.iteration, fmt(r.x), fmt(r.loss), fmt(r.gradient)]) },
      bars: { title: "Loss after each update", unit: "squared distance", items: trajectory.map((r) => ({ label: String(r.iteration), value: r.loss, detail: `x = ${fmt(r.x)}` })) },
      steps: [
        `Start at x = ${first.x}. Loss is ${fmt(first.loss)} and the derivative is ${fmt(first.gradient)}.`,
        `The first update is ${first.x} − ${p.rate} × ${first.gradient} = ${fmt(trajectory[1]!.x)}.`,
        `Writing error as e = x − 2 gives e_next = (1 − 2 × ${p.rate}) e. The sign tells you which side you land on; magnitude tells you whether you get closer.`,
        `After ${p.steps} updates, x = ${fmt(last.x)} and loss = ${fmt(last.loss)}. Compare the trajectory with the prediction, not just its last frame.`,
      ],
      insight: first.loss === 0 ? "You started at a stationary point: every update is zero. This exception does not make a large learning rate safe elsewhere." : last.loss < first.loss ? "The parameter ends closer to the minimum. Crossing the minimum is compatible with convergence when each crossing is smaller." : last.loss > first.loss ? "The update moves against the local slope, yet the large step increases loss. A correct gradient does not guarantee a good finite step." : "The final distance is unchanged. With this loss, a zero rate never moves and a rate of one oscillates without improvement.",
    };
  },
  predict(p) {
    const rows = gradientTrajectory(p);
    const first = rows[0]!.loss;
    const last = rows.at(-1)!.loss;
    const correctIndex = Math.abs(last - first) < 1e-9 ? 1 : last < first ? 0 : 2;
    return { prompt: `After ${p.steps} updates from x = ${p.start} at rate ${p.rate}, how far is x from the minimum compared with the start?`, choices: ["Closer to the minimum", "The same distance", "Farther from the minimum"], correctIndex, explanation: `The initial loss is ${fmt(first)} and final loss is ${fmt(last)}. Error multiplies by (1 − 2η) on every update. Equal squared distances mean equal absolute distances, even if the sign changes.` };
  },
  eli5: {
    analogy: "You are on a smooth bowl-shaped hill in the dark. Feel which way goes uphill, then take a step the other way. A tiny step is slow. A huge jump can throw you farther up the other side.",
    steps: ["The loss tells you how high you are above the bottom.", "The gradient tells you the uphill direction and steepness at your current spot.", "The learning rate chooses how far that information sends you.", "Check the new height, then repeat. Do not assume every downhill-pointing jump lands lower."],
    limit: "This hill has one coordinate and one smooth bottom. Neural-network losses have many coordinates, noise, plateaus and saddle points. The rate boundaries here are not universal training recommendations.",
  },
  senior: {
    principle: "For f(x) = (x − 2)², gradient descent updates x_next = x − η·2(x − 2). In error coordinates e = x − 2, this is e_next = (1 − 2η)e. Except at e = 0, convergence occurs exactly when 0 < η < 1.",
    assumptions: ["A deterministic scalar quadratic, exact derivative, fixed learning rate and no clipping, momentum or stochastic sampling.", "Loss is squared error in parameter space; it is not a measured downstream task metric."],
    mechanism: ["Backpropagation computes derivatives by the chain rule. An optimizer then uses those derivatives to choose updates; these are separate responsibilities.", "When 0 < η < 0.5, error approaches zero without changing sign. At η = 0.5 the next update lands exactly at the minimum.", "When 0.5 < η < 1, error alternates sign but shrinks. At η = 1 it oscillates; above one it grows unless the starting error is exactly zero."],
    tradeoffs: ["Full-batch gradients reduce sampling noise but use more work per update; mini-batches give cheaper noisy estimates.", "Momentum can accelerate some trajectories but changes their stability; Adam rescales coordinates and has different hyperparameters.", "Line searches adapt a step using extra objective evaluations; a fixed rate is simpler but can be brittle."],
    failureModes: ["Assuming every update lowers loss merely because the gradient is correct.", "Transferring this scalar stability threshold to a differently scaled or nonconvex objective.", "Confusing lower training loss with generalization, fairness or deployment usefulness."],
    interviewAnswer: "Backpropagation supplies derivatives; the optimizer turns them into parameter updates. I check loss scale, gradient norms, learning rate and validation behavior before blaming the model. A step can overshoot and still converge, or become unstable when its size exceeds the objective's curvature-dependent range. I would validate optimizer choices on the actual problem rather than transfer this toy quadratic's threshold.",
  },
  challenges: [
    { id: "overshoot", prompt: "A parameter crosses the optimum on every update. Must gradient descent be diverging?", choices: ["Yes, any crossing is unstable", "No, crossings can shrink", "Only if the dataset is small"], correctIndex: 1, explanation: "For this quadratic and η = 0.75, e_next = −0.5e. The sign flips, but magnitude halves and loss quarters.", hint: "Compare distance between successive crossings." },
    { id: "rescale", prompt: "You multiply the loss by 100 but keep the same learning rate. What changes?", choices: ["Only the displayed loss", "The optimum moves by 100", "The gradient is 100 times larger"], correctIndex: 2, explanation: "A positive constant preserves the minimizer but rescales every derivative. The previously stable step size may now be unstable.", hint: "Differentiate 100f(x)." },
  ],
  transfer: { prompt: "Training loss starts exploding after a change to feature units. Explain the diagnosis without saying only 'try a smaller learning rate'.", checklist: ["Check input and target scaling, loss reduction and gradient magnitudes", "Separate derivative bugs from optimizer/step-size issues", "Try a controlled small-batch experiment with finite-value checks", "Compare validation behavior and consider clipping or scaling only with a stated reason"], sampleAnswer: "I would compare the old and new feature and target scales, the loss reduction, and gradient norms on the same small batch. A unit change can rescale curvature and make the existing update too large even when derivatives are correct. I would check finite values and a numerical derivative on a small case, then adjust normalization and step size deliberately. Validation and downstream metrics still decide whether the training change is useful." },
  references: [{ title: "Dive into Deep Learning: Gradient Descent", url: "https://d2l.ai/chapter_optimization/gd.html" }, { title: "Deep Learning, chapter 8: Optimization", url: "https://www.deeplearningbook.org/contents/optimization.html" }],
}];
