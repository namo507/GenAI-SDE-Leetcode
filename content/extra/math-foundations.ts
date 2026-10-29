import { code, defineTopic, edge, node, step } from "../helpers";

export const linearAlgebraGeometry = defineTopic({
  id: "w01-d05-linear-algebra-geometry",
  slug: "linear-algebra-geometry",
  title: "Vectors and matrices: direction, similarity and transformation",
  domain: "foundations",
  roles: ["sde", "data-scientist", "data-analyst", "ml-engineer", "data-engineer", "genai-engineer"],
  difficulty: "beginner", minutes: 50,
  prerequisites: ["w01-d01-python-r-idioms"],
  objectives: ["Interpret a vector as coordinates with an explicitly chosen meaning and scale", "Compute dot products, norms, cosine similarity and matrix-vector products", "Check shapes and explain why transformation order changes an answer"],
  summary: "Vectors collect numbers in a fixed order. Dot products combine matching coordinates, norms measure length, and matrices turn one set of coordinates into another. These small ideas explain linear models, embeddings, attention, feature scaling and many data transformations.",
  eli5: {
    analogy: "Draw an arrow on squared paper: three steps right and four steps up. Its list is [3,4]. A machine can stretch the paper sideways and squash it upward. A second machine can turn it. Putting the machines in a different order may leave the arrow pointing somewhere else.",
    steps: ["Decide what each place in the list means. Never swap the places silently.", "Multiply matching places in two lists and add the results. That is the dot product.", "For an arrow's length, square its coordinates, add, then take a square root. [3,4] has length five.", "Divide a dot product by the two lengths to compare direction without length. That is cosine similarity.", "A matrix has one recipe per output coordinate. Apply each recipe to the input list, then check the result."],
    analogyLimit: "An embedding may have thousands of coordinates with no simple right/up meaning. Geometry depends on the chosen representation and scale. A large cosine score is not proof that two sentences mean the same thing, and a zero-length arrow has no defined direction.",
  },
  senior: {
    definition: "A vector in R^d is an ordered d-tuple relative to a basis. The Euclidean inner product is xᵀy = sum(x_i y_i), the L2 norm is sqrt(xᵀx), and cosine similarity divides the inner product by both nonzero norms. An m by d matrix A maps a d-dimensional column vector to an m-dimensional vector Ax.",
    invariants: ["Coordinate meanings, order, units and preprocessing must agree before multiplying vectors.", "A matrix-vector product requires the matrix column count to equal the vector length; Ax has one entry per matrix row.", "Cosine similarity is undefined for a zero vector. Positive rescaling preserves cosine but usually changes the dot product.", "Composition B(Ax) equals (BA)x. In general BA and AB differ, and one product may not even have a valid shape."],
    mechanism: ["For x=[3,4] and y=[4,3], xᵀy=24 and both lengths are five, so cosine is 24/25=0.96. Orthogonal directions have zero dot product; opposite directions have negative cosine.", "Read a matrix product either as one dot product per row or as a weighted sum of columns. Both views give the same output and help catch transposed batch dimensions.", "A=[[2,0],[0,0.5]] maps [3,4] to [6,2]. With B a 90-degree rotation, B(Ax)=[-2,6], while A(Bx)=[-8,1.5]. Scaling and rotation therefore do not commute here.", "Linear independence means no vector is a combination of the others. Matrix rank counts independent columns or rows. A map with a nontrivial nullspace loses information: multiple inputs can produce the same output, so a unique inverse is impossible.", "An eigenvector is a nonzero direction that a square matrix only scales: Av=lambda v. PCA and stability analysis use this idea, but a matrix need not have a complete real eigenbasis.", "A model's wᵀx is a weighted sum; retrieval often compares normalized embeddings; attention compares query and key vectors. Shapes and scales remain part of the model contract, not notation to skip."],
    complexity: "A dense d-dimensional dot product or norm costs O(d) time. A dense m by d matrix-vector product costs O(md) time and O(m) output space. The explicit matrix itself occupies O(md) space; sparse methods can exploit known zeros.",
    tradeoffs: [{ option: "Dot product", choose: "Magnitude is meaningful, such as a linear score or unnormalized model embedding.", cost: "Large norms can dominate ranking; feature scale must be controlled." }, { option: "Cosine similarity", choose: "Direction should matter more than magnitude.", cost: "Discards norm information and needs a zero-vector policy; it is representation-dependent." }, { option: "Dense versus sparse matrices", choose: "Use dense storage for mostly nonzero values and sparse storage when zeros dominate.", cost: "Sparse bookkeeping has overhead and operations can densify unexpectedly." }],
    failureModes: ["Comparing embeddings produced by different models or preprocessing pipelines.", "Treating elementwise multiplication as matrix multiplication.", "Normalizing a zero vector or interpreting cosine as a calibrated probability.", "Assuming AB=BA, or inverting a singular matrix instead of examining rank and the estimation problem."],
    production: "Version feature order and normalization with the model. Assert shapes at data boundaries, monitor embedding norms, and use tested linear-algebra libraries for large or ill-conditioned problems. The program below uses short lists to expose the arithmetic, not to benchmark a production BLAS implementation.",
    interviewAnswer: "I state shapes and feature semantics first. A dot product combines aligned coordinates, a norm measures magnitude, and cosine compares nonzero directions after removing magnitude. A matrix is a linear map, and composition order matters. In a model or retrieval system I also check representation compatibility, scaling, zero-vector handling and whether a transformation loses rank.",
  },
  implementation: {
    problem: "Compute similarity and compare two orders of a scaling and rotation transformation.",
    input: "x=[3,4], y=[4,3], A=[[2,0],[0,0.5]], B=[[0,-1],[1,0]].",
    python: { code: code`
      from math import sqrt

      def dot(x: list[float], y: list[float]) -> float:
          if len(x) != len(y):
              raise ValueError("shape mismatch")
          return sum(a * b for a, b in zip(x, y))

      def norm(x: list[float]) -> float:
          return sqrt(dot(x, x))

      def cosine(x: list[float], y: list[float]) -> float:
          denominator = norm(x) * norm(y)
          if denominator == 0:
              raise ValueError("zero vector has no direction")
          return dot(x, y) / denominator

      def matvec(matrix: list[list[float]], x: list[float]) -> list[float]:
          return [dot(row, x) for row in matrix]

      def show(x: list[float]) -> str:
          return ",".join(f"{v:.2f}" for v in x)

      x, y = [3.0, 4.0], [4.0, 3.0]
      a, b = [[2.0, 0.0], [0.0, 0.5]], [[0.0, -1.0], [1.0, 0.0]]
      print(f"dot: {dot(x,y):.2f} norm: {norm(x):.2f} cosine: {cosine(x,y):.2f}")
      print("A x: " + show(matvec(a, x)))
      print("B(Ax): " + show(matvec(b, matvec(a, x))) + " A(Bx): " + show(matvec(a, matvec(b, x))))
    ` },
    r: { code: code`
      dot <- function(x, y) {
        if (length(x) != length(y)) stop("shape mismatch")
        sum(x * y)
      }
      norm2 <- function(x) sqrt(dot(x, x))
      cosine <- function(x, y) {
        denominator <- norm2(x) * norm2(y)
        if (denominator == 0) stop("zero vector has no direction")
        dot(x, y) / denominator
      }
      matvec <- function(matrix, x) vapply(matrix, function(row) dot(row, x), numeric(1))
      show_values <- function(x) paste(sprintf("%.2f", x), collapse = ",")

      x <- c(3,4); y <- c(4,3)
      a <- list(c(2,0), c(0,0.5)); b <- list(c(0,-1), c(1,0))
      cat(sprintf("dot: %.2f norm: %.2f cosine: %.2f\n", dot(x,y), norm2(x), cosine(x,y)))
      cat("A x: ", show_values(matvec(a,x)), "\n", sep="")
      cat("B(Ax): ", show_values(matvec(b,matvec(a,x))), " A(Bx): ", show_values(matvec(a,matvec(b,x))), "\n", sep="")
    ` },
    expectedOutput: "dot: 24.00 norm: 5.00 cosine: 0.96\nA x: 6.00,2.00\nB(Ax): -2.00,6.00 A(Bx): -8.00,1.50",
    tests: { python: code`
      def test_geometry():
          assert dot([1,0],[0,1]) == 0
          assert dot(x,y) == dot(y,x)
          assert abs(cosine(x, [8,6]) - cosine(x,y)) < 1e-12
          assert matvec(b, matvec(a,x)) == [-2,6]

      def test_invalid_shapes_and_direction():
          for first, second in [([1],[1,2]), ([0,0],[1,2])]:
              try:
                  cosine(first,second)
              except ValueError:
                  pass
              else:
                  raise AssertionError("invalid geometry accepted")
    `, r: code`
      test_that("geometry and order are correct", {
        expect_equal(dot(c(1,0),c(0,1)), 0)
        expect_equal(dot(x,y), dot(y,x))
        expect_equal(cosine(x,c(8,6)), cosine(x,y))
        expect_equal(matvec(b,matvec(a,x)), c(-2,6))
      })
      test_that("invalid shapes and directions are refused", {
        expect_error(cosine(c(1),c(1,2)), "shape mismatch")
        expect_error(cosine(c(0,0),c(1,2)), "zero vector")
      })
    ` },
    eli5Trace: ["Multiply three by four and four by three, then add: 24.", "Both arrows have length five. Divide 24 by 25 to compare their directions.", "Stretch first and the arrow becomes [6,2]. Turn that arrow to get [-2,6]. Turning before stretching instead gives [-8,1.5]."],
    complexity: { time: "O(d) per dot product; O(md) per dense matrix-vector product", space: "O(m) output beyond the stored matrix", note: "The example has two coordinates; the formulas extend to any compatible dimensions." },
    edgeCases: ["Mismatched lengths must fail rather than silently dropping coordinates or recycling them in R.", "A zero vector cannot be cosine-normalized.", "A rectangular matrix changes dimension and usually has no two-sided inverse."],
    incorrect: { language: "python", code: "score = sum(a*b for a,b in zip(x,y))  # no length check", whyWrong: "zip silently truncates unequal lists, so a shape error can become a plausible but wrong score. R can recycle shorter vectors, which is a different silent failure.", fix: "Validate dimensions and feature ordering before computing a dot product or calling a numerical library." },
    walkthrough: [{ python: "def dot(", r: "dot <-", pythonLines: 4, rLines: 4, eli5: "Check both lists have the same number of places, then multiply matching places and add." }, { python: "def cosine(", r: "cosine <-", pythonLines: 5, rLines: 5, eli5: "Use the two lengths to remove size from the comparison. Stop if an arrow has no direction." }, { python: "def matvec(", r: "matvec <-", pythonLines: 2, rLines: 1, eli5: "Apply one dot-product recipe for every output place in the matrix." }, { python: "print(f\"dot:", r: "cat(sprintf(\"dot:", pythonLines: 3, rLines: 3, eli5: "Show the similarity and then compare the two orders of the same machines." }],
  },
  flow: { title: "A shape-checked linear transformation", nodes: [node("input","Coordinates [3,4]",0,100),node("shape","Check coordinate order and shape",250,100),node("map","Scale: [6,2]",500,100),node("turn","Rotate: [-2,6]",750,100)], edges: [edge("input","shape"),edge("shape","map"),edge("map","turn")], steps: [step("input","","The coordinates have a fixed order and meaning."),step("input shape","input-shape","The two matrix columns match the two input coordinates."),step("shape map","shape-map","The first row doubles the first coordinate; the second row halves the second."),step("map turn","map-turn","Rotate the result. Reversing the two operations gives a different answer.")] },
  practice: [{id:"w01-linalg-shapes",type:"recall",prompt:"A has shape 3 by 4 and x has length four. What is the shape of Ax? Can you multiply x by A in the same column-vector convention?",answer:"Ax is a length-three column vector. Multiplying a 4 by 1 column vector by a 3 by 4 matrix is not a valid matrix product: the inner dimensions do not match. State orientation instead of treating a one-dimensional array's behavior as mathematical notation.",rubric:["Three output coordinates","Inner dimensions match","Orientation stated"]},{id:"w01-linalg-similarity",type:"case",prompt:"A search team calls cosine similarity 0.96 a 96% chance that two texts mean the same thing. Explain the mistake simply and technically.",answer:"Two arrows can point almost the same way without being interchangeable objects. Cosine measures angle in a particular embedding space. It is not a calibrated probability or a semantic guarantee; evaluate retrieval on labelled queries and define zero-vector and model-version policies.",rubric:["Angle rather than probability","Representation dependence","Task evaluation"]},{id:"w01-linalg-rank",type:"design",prompt:"A feature transformation maps [x1,x2] to [x1+x2,x1+x2]. Can you recover every original input?",answer:"No. Both output coordinates repeat one sum, so the matrix has rank one. Inputs [1,2] and [2,1] both map to [3,3]. Information in the difference direction is lost, so there is no unique inverse for arbitrary inputs.",rubric:["Concrete counterexample","Rank deficiency","No unique inverse"]}],
  references: [{title:"Stanford CS229: Linear Algebra Review and Reference",url:"https://cs229.stanford.edu/lectures-spring2022/cs229-linear_algebra_review.pdf",versionSensitive:false}], lastReviewed:"2026-10-28",
});

export const derivativesChainRule = defineTopic({
  id:"w01-d05-derivatives-chain-rule",slug:"derivatives-chain-rule",title:"Derivatives and the chain rule: how a small change travels",domain:"foundations",roles:["data-scientist","data-analyst","ml-engineer","genai-engineer"],difficulty:"beginner",minutes:45,prerequisites:["w01-d01-python-r-idioms"],
  objectives:["Explain a derivative as local sensitivity with units","Apply the chain rule to a composed loss","Check an analytical gradient with a central finite difference and recognize its limits"],
  summary:"A derivative measures how quickly an output changes near an input. The chain rule follows a small change through intermediate steps. This is the idea behind backpropagation, sensitivity analysis and gradient-based optimization.",
  eli5:{analogy:"A toy machine turns a knob into the speed of a belt, and the belt moves a cart. Turning the knob a tiny bit changes the belt, which changes the cart. To know how much the cart changes, follow both links instead of looking only at the last one.",steps:["Write down each little step between the knob and the final result.","Ask how much each step changes when its own input moves a little.","Multiply the changes along one path. If the knob reaches the result by two paths, add both contributions.","Try a very small step forward and backward to check your calculation.","Move against the local uphill direction to reduce an error, then measure again."],analogyLimit:"A derivative describes a tiny local change, not every large turn of the knob. Corners may have no unique derivative, rounding can spoil tiny numerical checks, and a downhill step can overshoot if it is too large."},
  senior:{definition:"For a scalar differentiable function f, f'(x) is the limit of [f(x+h)-f(x)]/h as h approaches zero. It gives the linear approximation f(x+h) approximately f(x)+f'(x)h. For L=g(u(w)), the chain rule gives dL/dw=(dL/du)(du/dw). A gradient collects partial derivatives with respect to multiple coordinates.",invariants:["Hold other inputs fixed when taking a partial derivative, and track the units of each sensitivity.","The stated derivative requires differentiability at the point; a chosen subgradient at a corner is a separate convention.","Multiply sensitivities along paths and add contributions from different paths that depend on the same variable.","A finite-difference agreement is a diagnostic at selected points, not a proof of global correctness or convergence."],mechanism:["Let prediction p=wx and squared loss L=(p-y)^2. At x=2, y=6, w=1, p=2 and L=16. The two local derivatives are dL/dp=2(p-y)=-8 and dp/dw=x=2, so dL/dw=-16.","The negative derivative says increasing w slightly decreases this loss. With learning rate 0.1, w_new=w-0.1(-16)=2.6 and loss becomes (5.2-6)^2=0.64. The learning rate has its own units and is not the derivative.","A central finite difference [L(w+h)-L(w-h)]/(2h) approximates the same derivative. Truncation error generally falls as h gets smaller for a smooth function, but cancellation and floating-point roundoff eventually dominate.","For z=x*x with two computational paths from x to multiplication, both contributions matter: dz/dx=x+x=2x. Reverse-mode automatic differentiation accumulates these local contributions; it does not symbolically differentiate a printed formula or use tiny finite differences for every weight.","In several dimensions the gradient is the steepest local increase under the Euclidean norm. Coordinate scaling changes this geometry; an optimizer's step rule and learning rate determine the actual movement."],complexity:"For a computation with k scalar operations and a scalar output, a reverse-mode gradient is typically a constant-factor multiple of a forward evaluation, with storage for needed intermediates. Checking d parameters by central differences requires about 2d evaluations. The single-weight fixture costs O(1).",tradeoffs:[{option:"Analytical derivative",choose:"A small formula can be derived and reviewed directly.",cost:"Manual algebra is error-prone for a large graph."},{option:"Automatic differentiation",choose:"A differentiable program has many parameters and a scalar objective.",cost:"Retained intermediates consume memory; unsupported operations and unintended graph breaks need attention."},{option:"Finite differences",choose:"A small diagnostic independently checks selected coordinates.",cost:"Step-size sensitivity, extra evaluations and nondifferentiable points can mislead."}],failureModes:["Omitting the inner derivative x and returning -8 instead of -16.","Overwriting a gradient when several graph paths should add into it.","Choosing a huge learning rate and assuming the local approximation guarantees a loss decrease.","Using an extremely small finite-difference step and mistaking cancellation error for a bad analytical gradient."],production:"Use automatic differentiation for model training and finite differences for small targeted gradient checks. Check several scales and smooth points, control randomness during the check, inspect NaN/Inf values, and distinguish training loss improvement from validation performance.",interviewAnswer:"A derivative is a local sensitivity, with units, and the chain rule propagates it through a composition. For squared error on wx, I multiply the loss sensitivity by x and add contributions if a parameter has several paths. Backpropagation implements reverse-mode accumulation efficiently for a scalar loss. I can check selected gradients numerically, but must consider step size, nondifferentiability and floating-point error."},
  implementation:{problem:"Derive and numerically check one squared-error gradient, then take a loss-reducing update.",input:"x=2, target=6, weight=1, central-difference h=0.00001, learning rate=0.1.",python:{code:code`
    def loss(w: float, x: float, y: float) -> float:
        return (w * x - y) ** 2

    def gradient(w: float, x: float, y: float) -> float:
        prediction = w * x
        return 2 * (prediction - y) * x

    def central_difference(w: float, x: float, y: float, h: float) -> float:
        if h <= 0:
            raise ValueError("h must be positive")
        return (loss(w+h,x,y)-loss(w-h,x,y))/(2*h)

    x, y, w, rate = 2.0, 6.0, 1.0, 0.1
    g = gradient(w,x,y)
    estimate = central_difference(w,x,y,0.00001)
    updated = w - rate * g
    print(f"loss before: {loss(w,x,y):.2f}")
    print(f"chain gradient: {g:.4f}; numerical check: {estimate:.4f}")
    print(f"weight after: {updated:.2f}; loss after: {loss(updated,x,y):.2f}")
  `},r:{code:code`
    loss <- function(w,x,y) (w*x-y)^2
    gradient <- function(w,x,y) {
      prediction <- w*x
      2*(prediction-y)*x
    }
    central_difference <- function(w,x,y,h) {
      if (h <= 0) stop("h must be positive")
      (loss(w+h,x,y)-loss(w-h,x,y))/(2*h)
    }
    x <- 2; y <- 6; w <- 1; rate <- 0.1
    g <- gradient(w,x,y)
    estimate <- central_difference(w,x,y,0.00001)
    updated <- w-rate*g
    cat(sprintf("loss before: %.2f\n",loss(w,x,y)))
    cat(sprintf("chain gradient: %.4f; numerical check: %.4f\n",g,estimate))
    cat(sprintf("weight after: %.2f; loss after: %.2f\n",updated,loss(updated,x,y)))
  `},expectedOutput:"loss before: 16.00\nchain gradient: -16.0000; numerical check: -16.0000\nweight after: 2.60; loss after: 0.64",tests:{python:code`
    def test_gradient_checks():
        assert gradient(1,2,6) == -16
        for weight in [-2.0,0.5,3.0]:
            assert abs(gradient(weight,2,6)-central_difference(weight,2,6,1e-5)) < 1e-6
        assert gradient(3,2,6) == 0

    def test_step_and_invalid_h():
        assert loss(updated,x,y) < loss(w,x,y)
        assert loss(w-1.0*g,x,y) > loss(w,x,y)
        try:
            central_difference(w,x,y,0)
        except ValueError:
            return
        raise AssertionError("zero step accepted")
  `,r:code`
    test_that("chain gradients agree with numerical checks", {
      expect_equal(gradient(1,2,6),-16)
      for (weight in c(-2,0.5,3)) expect_equal(gradient(weight,2,6),central_difference(weight,2,6,1e-5),tolerance=1e-6)
      expect_equal(gradient(3,2,6),0)
    })
    test_that("step size matters and h must be positive", {
      expect_true(loss(updated,x,y)<loss(w,x,y))
      expect_true(loss(w-g,x,y)>loss(w,x,y))
      expect_error(central_difference(w,x,y,0),"h must be positive")
    })
  `},eli5Trace:["The knob starts at one. Two times one predicts two, four below the target, giving squared error sixteen.","The error changes by -8 per prediction unit, and prediction changes by two per weight unit. Multiply to get -16.","A small step against that slope moves the weight to2.6. The new prediction5.2 leaves squared error0.64; a much larger step can make things worse."],complexity:{time:"O(1) for this one-weight example",space:"O(1)",note:"A d-parameter central-difference check generally needs2d loss evaluations."},edgeCases:["At a perfect fit the gradient is zero; this does not generalize to all stationary points in a nonconvex model being minima.","An h of zero is invalid; an h too close to machine precision can lose the subtraction signal.","A zero input makes this loss independent of w, so its derivative is zero even if the target is not predicted correctly."],incorrect:{language:"python",code:"return 2 * (w*x-y)  # missing inner derivative",whyWrong:"This is the loss derivative with respect to prediction, not weight. Changing weight changes prediction by x times as much.",fix:"Multiply by x using the chain rule, and add any other paths that depend on the same parameter."},walkthrough:[{python:"def gradient(",r:"gradient <-",pythonLines:3,rLines:4,eli5:"Follow the error through prediction to the weight, multiplying the two sensitivities."},{python:"def central_difference(",r:"central_difference <-",pythonLines:4,rLines:4,eli5:"Move a tiny equal distance in both directions and compare the two losses as an independent check."},{python:"updated =",r:"updated <-",pythonLines:4,rLines:4,eli5:"Move against the slope with a chosen small step, then measure the new loss instead of assuming improvement."}]},
  flow:{title:"Follow the chain, then move against it",nodes:[node("weight","Weight w=1",0,100),node("prediction","Prediction p=2",250,100),node("loss","Loss L=16",500,100),node("gradient","Gradient -8 x2=-16",500,260),node("update","New w=2.6, L=0.64",250,260)],edges:[edge("weight","prediction"),edge("prediction","loss"),edge("loss","gradient"),edge("gradient","update")],steps:[step("weight prediction","weight-prediction","Prediction changes by x=2 for each tiny weight change."),step("prediction loss","prediction-loss","Loss changes by2(p-y)=-8 per prediction unit."),step("loss gradient","loss-gradient","Multiply the two local sensitivities to obtain -16."),step("gradient update","gradient-update","Subtract learning rate times gradient, then recompute the loss.")]},
  practice:[{id:"w01-chain-units",type:"recall",prompt:"Why is a derivative a local statement, and how would you explain the chain rule without calculus vocabulary?",answer:"Near the current setting, it tells how much the result changes per tiny input change. If the setting changes an intermediate part and that part changes the result, multiply those two sensitivities. For a large change, the sensitivities may change along the way, so the local prediction can fail.",rubric:["Tiny local change","Multiply along composition","Large-step limitation"]},{id:"w01-chain-two-paths",type:"code",prompt:"A graph computes z=x*x by using x in both input positions. At x=3, what derivative should reverse accumulation produce?",answer:"Six. Each input position contributes the other input value, three, and both depend on the same x. Add the two contributions instead of keeping only one.",rubric:["Two paths","Each contributes3","Sum gives6"]},{id:"w01-chain-check",type:"design",prompt:"A numerical gradient check fails only when h is extremely tiny. What do you investigate before changing the derivative?",answer:"Check subtraction cancellation and floating-point precision, try a range of step sizes at smooth points, freeze stochastic layers and inputs, and compare relative as well as absolute error. Also check units and scaling. A smaller h is not always a better numerical approximation.",rubric:["Roundoff/cancellation","Range of h","Deterministic smooth check","Scaling"]}],
  references:[{title:"MIT OpenCourseWare: Differentiation and the chain rule",url:"https://ocw.mit.edu/courses/18-01sc-single-variable-calculus-fall-2010/pages/1.-differentiation/",versionSensitive:false},{title:"Deep Learning, chapter4: Numerical Computation",url:"https://www.deeplearningbook.org/contents/numerical.html",versionSensitive:false}],lastReviewed:"2026-10-28",
});
