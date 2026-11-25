import { code, defineTopic, edge, node, step } from "../helpers";

export const informationTheory = defineTopic({
  id:"w05-d04-information-theory",slug:"information-theory",title:"Entropy, cross-entropy and KL divergence",domain:"statistics",roles:["data-scientist","data-analyst","ml-engineer","genai-engineer","data-engineer"],difficulty:"intermediate",minutes:50,prerequisites:["w05-d01-probability-distributions"],
  objectives:["Distinguish surprise for one outcome from average uncertainty over outcomes","Compute entropy, cross-entropy and directed KL divergence with explicit log units","Explain log loss and perplexity without confusing confidence, accuracy and calibration"],
  summary:"A rare event is surprising. Entropy averages that surprise under a distribution. Cross-entropy asks how surprising the same events look under a different forecast, and KL measures the extra expected log loss from that mismatch. These ideas connect probability, compression, classification loss and language-model evaluation.",
  eli5:{analogy:"A bag holds three red marbles for every blue one. You send a friend a message telling which color you drew. A good code gives the usual red color a shorter message and the rarer blue color a longer one. A code designed for the wrong bag wastes space on average.",steps:["One unusual draw tells you more than a draw you almost expected.","Average the surprise of all the colors using how often the bag really produces them. That is entropy.","Use a friend's predicted color chances instead. Their average surprise on your bag is cross-entropy.","Subtract the bag's own entropy to see the extra cost of that prediction. That is KL divergence.","A prediction of zero for a color that can happen is a serious mistake: no finite message in this ideal code can describe it."],analogyLimit:"Ideal code lengths can be fractions of a bit and describe long-run averages, not necessarily the length of a single physical message. The true bag probabilities are often unknown. Log loss evaluates probability forecasts, not whether generated text is truthful or useful."},
  senior:{definition:"For discrete distributions P and Q on the same support, surprise is -log p(x), entropy H(P)=-sum p log p, cross-entropy H(P,Q)=-sum p log q, and KL D(P||Q)=sum p log(p/q)=H(P,Q)-H(P). Base2 gives bits; natural logs give nats. Terms with p=0 contribute0 by the limiting convention.",invariants:["Probabilities are nonnegative, finite and sum to one; P and Q refer to the same labelled outcomes.","If p_i>0 but q_i=0, cross-entropy and D(P||Q) are infinite. Zero-probability P terms are skipped rather than evaluating0*log(0).","KL is nonnegative mathematically, but is directed and does not satisfy all metric axioms. Small floating-point residuals may occur around zero.","Observed mean log loss estimates cross-entropy for the evaluation distribution; it does not reveal an unknowable true distribution from one sample."],mechanism:["For P=[0.75,0.25], base2 entropy is -0.75 log2(0.75)-0.25 log2(0.25)=0.811278 bits. A fair two-outcome distribution has entropy1 bit and a deterministic one has entropy0.","For Q=[0.5,0.5], every observed outcome costs1 bit, so H(P,Q)=1.000000 and D(P||Q)=0.188722 bits. Predicting P itself attains H(P), the minimum population cross-entropy under this scoring rule.","A one-hot observed class y gives loss -log Q(y). Averaging over labelled examples estimates an expected cross-entropy. Two models can make identical top-class decisions while assigning different probabilities and therefore different log losses.","Forward KL averages over P and heavily penalizes Q assigning too little mass where P has mass. Reverse KL averages over Q instead; it asks a different question. Naming the direction matters in variational inference and distribution matching.","With natural-log mean token loss L, perplexity is exp(L); with base2 loss it is2^L. Compare perplexities only with compatible tokenization, evaluation data and scoring conventions. Lower perplexity is not automatically better factuality, safety or downstream task performance.","Mutual information I(X;Y)=D(P(X,Y)||P(X)P(Y)) measures how much knowing one variable reduces uncertainty about the other. It is symmetric in X and Y, unlike a general KL comparison, and association still does not establish causation."],complexity:"For k discrete outcomes, the explicit sums cost O(k) time and O(1) extra accumulator space. Estimating high-dimensional probability distributions reliably is a statistical challenge, even when computing the sum is cheap.",tradeoffs:[{option:"Cross-entropy/log loss",choose:"Probability quality matters, and overconfident wrong forecasts should be costly.",cost:"Sensitive to tiny predicted probabilities and label errors; compare the same units and population."},{option:"Accuracy",choose:"You need the fraction of hard decisions that are correct at a stated decision rule.",cost:"Ignores forecast confidence and unequal error costs."},{option:"Brier score",choose:"A bounded squared-probability loss and decomposable forecast diagnostic are useful.",cost:"Weights large errors differently from log loss; neither score alone replaces subgroup or decision analysis."}],failureModes:["Calling entropy the uncertainty of one specific outcome rather than an average over a distribution.","Computing KL after accidentally changing class order or dropping classes with nonzero P mass.","Silently adding epsilon to zero probabilities without reporting that the forecast and scoring rule changed.","Comparing token perplexity across different tokenizers or claiming that perplexity measures factual correctness."],production:"Record label order, log base, aggregation weights and evaluation population with loss metrics. Use stable fused log-softmax/cross-entropy implementations for model logits. Inspect calibration, subgroup losses and decision costs alongside average log loss, and report any clipping policy explicitly.",interviewAnswer:"Entropy is the expected surprise under a distribution; cross-entropy is the expected surprise when I score those outcomes with another forecast. Their difference is directed KL, measured in bits or nats according to the log base. For classification, mean negative log probability of the observed label estimates cross-entropy and penalizes confident mistakes. I keep that separate from accuracy, calibration and application quality."},
  implementation:{problem:"Calculate discrete entropy, cross-entropy and both KL directions, including zero-probability edge handling.",input:"P=[0.75,0.25], Q=[0.5,0.5], log base2.",python:{code:code`
    from math import isfinite, log2, inf

    def validate(p: list[float]) -> None:
        if not p or any(not isfinite(x) or x < 0 for x in p) or abs(sum(p)-1) > 1e-9:
            raise ValueError("invalid probability distribution")

    def cross_entropy(p: list[float], q: list[float]) -> float:
        validate(p); validate(q)
        if len(p) != len(q):
            raise ValueError("outcome mismatch")
        total = 0.0
        for actual, predicted in zip(p,q):
            if actual == 0:
                continue
            if predicted == 0:
                return inf
            total -= actual * log2(predicted)
        return total

    def entropy(p: list[float]) -> float:
        return cross_entropy(p,p)

    def kl(p: list[float], q: list[float]) -> float:
        return cross_entropy(p,q)-entropy(p)

    p, q = [0.75,0.25], [0.5,0.5]
    print(f"entropy P: {entropy(p):.6f} bits")
    print(f"cross-entropy P,Q: {cross_entropy(p,q):.6f} bits")
    print(f"KL P||Q: {kl(p,q):.6f}; KL Q||P: {kl(q,p):.6f} bits")
    print(f"perplexity under Q: {2**cross_entropy(p,q):.6f}")
  `},r:{code:code`
    validate <- function(p) {
      if (length(p)==0 || any(!is.finite(p)) || any(p<0) || abs(sum(p)-1)>1e-9) stop("invalid probability distribution")
    }
    cross_entropy <- function(p,q) {
      validate(p); validate(q)
      if (length(p)!=length(q)) stop("outcome mismatch")
      total <- 0
      for (i in seq_along(p)) {
        if (p[i]==0) next
        if (q[i]==0) return(Inf)
        total <- total-p[i]*log2(q[i])
      }
      total
    }
    entropy <- function(p) cross_entropy(p,p)
    kl <- function(p,q) cross_entropy(p,q)-entropy(p)
    p <- c(0.75,0.25); q <- c(0.5,0.5)
    cat(sprintf("entropy P: %.6f bits\n",entropy(p)))
    cat(sprintf("cross-entropy P,Q: %.6f bits\n",cross_entropy(p,q)))
    cat(sprintf("KL P||Q: %.6f; KL Q||P: %.6f bits\n",kl(p,q),kl(q,p)))
    cat(sprintf("perplexity under Q: %.6f\n",2^cross_entropy(p,q)))
  `},expectedOutput:"entropy P: 0.811278 bits\ncross-entropy P,Q: 1.000000 bits\nKL P||Q: 0.188722; KL Q||P: 0.207519 bits\nperplexity under Q: 2.000000",tests:{python:code`
    def test_information_identities():
        assert abs(kl(p,p)) < 1e-12
        assert entropy([1,0]) == 0
        assert entropy([0.5,0.5]) == 1
        assert abs(cross_entropy(p,q)-entropy(p)-kl(p,q)) < 1e-12
        assert kl(p,q) > 0 and abs(kl(p,q)-kl(q,p)) > 0.01

    def test_support_and_validation():
        assert cross_entropy([1,0],[1,0]) == 0
        assert cross_entropy([0.5,0.5],[1,0]) == inf
        try:
            entropy([0.2,0.2])
        except ValueError:
            return
        raise AssertionError("unnormalized probabilities accepted")
  `,r:code`
    test_that("identities and direction hold", {
      expect_equal(kl(p,p),0,tolerance=1e-12)
      expect_equal(entropy(c(1,0)),0)
      expect_equal(entropy(c(0.5,0.5)),1)
      expect_equal(cross_entropy(p,q),entropy(p)+kl(p,q))
      expect_true(abs(kl(p,q)-kl(q,p))>0.01)
    })
    test_that("support and probability validation are explicit", {
      expect_equal(cross_entropy(c(1,0),c(1,0)),0)
      expect_equal(cross_entropy(c(0.5,0.5),c(1,0)),Inf)
      expect_error(entropy(c(0.2,0.2)),"invalid probability")
    })
  `},eli5Trace:["The real bag produces red three quarters of the time and blue one quarter. Its average surprise is about0.811278 bits.","The forecast says each color has chance one half, so either color costs one bit.","The extra cost is1 minus0.811278, about0.188722 bits. Swapping the real bag and forecast changes that average and gives a different KL."],complexity:{time:"O(k) for k aligned outcomes",space:"O(1) extra accumulator space",note:"This is a finite discrete teaching example, not a density estimator for continuous variables."},edgeCases:["P gives zero mass: its term contributes zero even when Q is also zero.","Q gives zero mass where P is positive: cross-entropy is infinite, rather than a finite clipped value.","Probability vectors must have the same labelled outcomes, not merely equal lengths."],incorrect:{language:"python",code:"distance = sum(abs(a-b) for a,b in zip(p,q))  # labelled KL",whyWrong:"This is an L1 difference, not the expected log-ratio defining KL. It has different units, symmetry and interpretation.",fix:"State the KL direction and log base, validate support, then compute sum(p*log(p/q)) or the equivalent cross-entropy minus entropy."},walkthrough:[{python:"def validate(",r:"validate <-",pythonLines:3,rLines:3,eli5:"Check that each bag description contains valid chances that add to one."},{python:"for actual, predicted",r:"for (i in seq_along(p))",pythonLines:6,rLines:5,eli5:"Skip impossible real outcomes, refuse a finite score for a possible outcome predicted impossible, and average the log surprises."},{python:"def kl(",r:"kl <-",pythonLines:2,rLines:1,eli5:"Subtract the best average surprise for the real bag to isolate the extra cost of the other forecast."},{python:"print(f\"entropy P:",r:"cat(sprintf(\"entropy P:",pythonLines:4,rLines:4,eli5:"Print the two averages, the two KL directions and the perplexity using the matching log base."}]},
  flow:{title:"From a forecast to expected log loss",nodes:[node("real","Real distribution P",0,100),node("forecast","Forecast Q",250,100),node("surprise","-log2 Q(outcome)",500,100),node("average","Average using P",750,100),node("extra","Subtract H(P): KL",750,260)],edges:[edge("real","average"),edge("forecast","surprise"),edge("surprise","average"),edge("average","extra")],steps:[step("real forecast","","Align the same outcome labels in P and Q."),step("forecast surprise","forecast-surprise","The forecast assigns a surprise cost to each possible outcome."),step("real average surprise","real-average surprise-average","Average those costs using how often P produces each outcome."),step("average extra","average-extra","Subtract entropy of P to measure the extra expected log loss of using Q.")]},
  practice:[{id:"w05-info-units",type:"recall",prompt:"A model reports mean negative natural-log probability of0.7 per token. What is perplexity, and what must match before comparing it with another model?",answer:"Perplexity is exp(0.7), about2.01. The tokenization, evaluation data, token masking and aggregation conventions must be compatible. If the loss used log base2 instead, the conversion would be2^0.7. Neither value directly measures factuality or interview readiness.",rubric:["Correct exponential base","Comparable tokenizer/data/protocol","Quality limit"]},{id:"w05-info-confidence",type:"case",prompt:"Two classifiers choose the correct class on exactly the same80% of examples. Must their cross-entropies match?",answer:"No. Accuracy sees only the selected class, while cross-entropy uses the probability assigned to the observed class. A model that is extremely confident on its wrong20% can have much worse log loss. Inspect calibration and decision costs as well.",rubric:["Hard labels versus probabilities","Confident wrong penalty","Other evaluation dimensions"]},{id:"w05-info-support",type:"design",prompt:"Your evaluation code replaces all zero probabilities with0.000001. What should the report explain?",answer:"The raw forecast assigns an infinite log loss to an observed outcome it calls impossible. Clipping makes that score finite and changes the evaluated probabilities; any renormalization changes them again. Report the threshold, normalization and motivation, and prefer stable log-probabilities from logits when zeros are numerical artifacts rather than true model assertions.",rubric:["Support mismatch","Changed scoring policy","Threshold and normalization disclosed","Stable logits"]}],
  references:[{title:"Shannon: A Mathematical Theory of Communication",url:"https://web.mit.edu/6.976/www/handout/shannon.pdf",versionSensitive:false},{title:"Deep Learning, chapter3: Probability and Information Theory",url:"https://www.deeplearningbook.org/contents/prob.html",versionSensitive:false}],lastReviewed:"2026-10-28",
});

export const samplingSelectionBias = defineTopic({
  id:"w05-d05-sampling-selection-bias",slug:"sampling-selection-bias",title:"Sampling and selection bias: who is missing from your data?",domain:"statistics",roles:["data-scientist","data-analyst","data-engineer","ml-engineer","genai-engineer"],difficulty:"intermediate",minutes:50,prerequisites:["w05-d01-probability-distributions","w05-d02-hypothesis-testing"],
  objectives:["Separate a target population, sampling frame, sample and observed respondents","Distinguish random sampling error from coverage, nonresponse and selection bias","Compute a stratified weighted estimate and explain the assumptions and precision cost"],
  summary:"A huge table can give a precise answer about the wrong people. Before calculating a metric, ask who could enter the data, who actually entered it and who disappeared. Weighting can repair some observed composition differences, but it cannot create information about groups or outcome differences you never observe.",
  eli5:{analogy:"You ask children standing by the ice-cream stall whether they like ice cream. Almost everyone says yes. Asking a thousand more children in the same line does not tell you what the whole school thinks. Children who dislike ice cream may never come near the stall.",steps:["Name the whole group you want to describe: the school, not just the queue.","List who could be asked and who actually answered.","Check whether some groups appear too often or are missing.","If you know the school's group sizes and each group's answers are representative, let each group speak in the correct proportion.","If children within a group still answer differently because of an unseen reason, changing group sizes cannot fix that."],analogyLimit:"You rarely know every missing child's opinion. Weighting relies on assumptions about observed groups and the chance of being selected or responding. It is not a magic way to turn volunteers into a random sample, and heavy weights can make an estimate much noisier."},
  senior:{definition:"Sampling error is variation from a sampling mechanism; selection bias is systematic distortion from who is covered, selected, observed or retained relative to the estimand. The target population, sampling frame, eligible sample, respondents and analytic sample are distinct sets. A post-stratified mean combines stratum-specific observed means using known target-population shares.",invariants:["Define the estimand's population and time period before inspecting a convenient dataset.","Probability sampling requires known, nonzero inclusion probabilities over the intended frame; random treatment assignment is a different operation.","Post-stratification needs correct population shares, observed support in each target stratum and representative outcomes among observed units within strata, or an explicit model that justifies the adjustment.","Inverse-probability weighting additionally requires correctly known or estimated selection/response probabilities and positive probabilities where the target has support. Unobserved outcome-dependent missingness can remain biased."],mechanism:["In the fixture, the school is80% groupA and20% groupB. The observed respondents are20% A and80% B, with satisfaction rates0.9 and0.5. Their unweighted mean is0.58, while the population-composition estimate is0.8*0.9+0.2*0.5=0.82 under within-group representativeness.","Each A respondent represents80/20=4 target people in relative units, while each B respondent represents20/80=0.25. Weighting the100 respondents reproduces0.82. The contrast is caused by composition, not a new measurement of missing individuals.","The Kish effective sample-size diagnostic is (sum w)^2/sum(w^2). Here it is about30.77 despite100 respondents. This unequal-weight diagnostic does not include clustering, stratification benefits or all features of a survey design; full uncertainty estimation must respect the actual design.","Coverage bias can start before sampling, such as a phone-only frame excluding people without the required phone access. Nonresponse occurs after selection, and attrition removes participants over follow-up. Survivorship bias analyzes only units that persist, such as profitable firms or retained users.","A higher response rate is useful operational information but is not a universal measure of bias. Bias depends on how response relates to the outcome as well as how many respond. Compare respondents to frame benchmarks, study recruitment and follow-up, and perform justified sensitivity analyses.","Random assignment supports treatment comparisons within an experiment; it does not by itself make experiment participants representative of a broader population. Model training, analytics dashboards and RAG evaluation sets face the same target-population question."],complexity:"For n respondents and k strata, counting and weighting cost O(n+k) time and O(k) aggregate storage. Reliable population totals, selection models and design-aware uncertainty are the hard parts; a fast weighted average does not validate the design.",tradeoffs:[{option:"Probability sample with follow-up",choose:"Population inference matters and a suitable frame is available.",cost:"Recruitment and follow-up cost time; coverage and nonresponse still need assessment."},{option:"Post-stratification or response weighting",choose:"Known target margins and defensible within-group response assumptions support adjustment.",cost:"High or unstable weights reduce precision and cannot remove every hidden selection mechanism."},{option:"Convenience sample with explicit scope",choose:"Exploration or an operational metric concerns the observed group itself.",cost:"Generalizing to unobserved populations requires new evidence, not a larger row count."}],failureModes:["Using a tiny standard error as proof that a biased convenience sample represents the population.","Giving a target stratum zero observations and pretending a finite weight can recover its outcome mean.","Trimming extreme weights without describing the resulting bias-variance and estimand trade-off.","Confusing random treatment assignment with random recruitment or ignoring attrition after assignment."],production:"Document eligibility and recruitment in data contracts. Track coverage, response and attrition by relevant groups; protect privacy when doing so. Publish weighted and unweighted estimates with the design, target margins, effective sample-size diagnostic and uncertainty method. For changing products or model evaluations, refresh population definitions and audit who never appears in logs.",interviewAnswer:"I first define the target population, then trace the sampling frame, recruitment, response and analysis filters. More rows shrink sampling error under a design but do not automatically remove selection bias. Weighting can align observed composition when support and within-group assumptions are credible, often at a precision cost. I show those assumptions and the remaining missingness limits instead of claiming the weighted result is automatically representative."},
  implementation:{problem:"Compare a respondent mean with a post-stratified target estimate and an unequal-weight effective sample-size diagnostic.",input:"Target shares A=0.8,B=0.2; respondents A=20,B=80; group satisfaction A=0.9,B=0.5.",python:{code:code`
    def weighted_estimate(counts: list[int], means: list[float], shares: list[float]) -> tuple[float,float,float]:
        if not (len(counts)==len(means)==len(shares)) or not counts:
            raise ValueError("strata must align")
        if any(n<0 for n in counts) or any(s<0 for s in shares) or abs(sum(shares)-1)>1e-9:
            raise ValueError("invalid counts or shares")
        if any(n==0 and s>0 for n,s in zip(counts,shares)):
            raise ValueError("target stratum has no observations")
        total = sum(counts)
        if total == 0:
            raise ValueError("no respondents")
        raw = sum(n*m for n,m in zip(counts,means))/total
        adjusted = sum(s*m for s,m in zip(shares,means))
        weights = [total*s/n if n else 0 for n,s in zip(counts,shares)]
        sum_w = sum(n*w for n,w in zip(counts,weights))
        sum_w2 = sum(n*w*w for n,w in zip(counts,weights))
        ess = sum_w*sum_w/sum_w2
        return raw,adjusted,ess

    raw, adjusted, ess = weighted_estimate([20,80],[0.9,0.5],[0.8,0.2])
    print(f"respondent mean: {raw:.4f}")
    print(f"post-stratified estimate: {adjusted:.4f}")
    print(f"respondents: 100; unequal-weight effective n: {ess:.2f}")
  `},r:{code:code`
    weighted_estimate <- function(counts,means,shares) {
      if (!(length(counts)==length(means) && length(means)==length(shares)) || length(counts)==0) stop("strata must align")
      if (any(counts<0) || any(shares<0) || abs(sum(shares)-1)>1e-9) stop("invalid counts or shares")
      if (any(counts==0 & shares>0)) stop("target stratum has no observations")
      total <- sum(counts)
      if (total==0) stop("no respondents")
      raw <- sum(counts*means)/total
      adjusted <- sum(shares*means)
      weights <- numeric(length(counts))
      present <- counts>0
      weights[present] <- total*shares[present]/counts[present]
      sum_w <- sum(counts*weights)
      sum_w2 <- sum(counts*weights^2)
      c(raw=raw,adjusted=adjusted,ess=sum_w^2/sum_w2)
    }
    result <- weighted_estimate(c(20,80),c(0.9,0.5),c(0.8,0.2))
    cat(sprintf("respondent mean: %.4f\n",result["raw"]))
    cat(sprintf("post-stratified estimate: %.4f\n",result["adjusted"]))
    cat(sprintf("respondents: 100; unequal-weight effective n: %.2f\n",result["ess"]))
  `},expectedOutput:"respondent mean: 0.5800\npost-stratified estimate: 0.8200\nrespondents: 100; unequal-weight effective n: 30.77",tests:{python:code`
    def test_adjustment_and_equal_weights():
        raw,adjusted,ess = weighted_estimate([20,80],[0.9,0.5],[0.8,0.2])
        assert abs(raw-0.58)<1e-12 and abs(adjusted-0.82)<1e-12
        assert 30<ess<31
        raw,adjusted,ess = weighted_estimate([80,20],[0.9,0.5],[0.8,0.2])
        assert abs(raw-adjusted)<1e-12 and abs(ess-100)<1e-12

    def test_missing_support():
        try:
            weighted_estimate([0,80],[0.9,0.5],[0.8,0.2])
        except ValueError as error:
            assert "no observations" in str(error)
        else:
            raise AssertionError("unsupported stratum accepted")
  `,r:code`
    test_that("adjustment and equal weights are correct", {
      result <- weighted_estimate(c(20,80),c(0.9,0.5),c(0.8,0.2))
      expect_equal(unname(result["raw"]),0.58)
      expect_equal(unname(result["adjusted"]),0.82)
      expect_true(result["ess"]>30 && result["ess"]<31)
      balanced <- weighted_estimate(c(80,20),c(0.9,0.5),c(0.8,0.2))
      expect_equal(unname(balanced["raw"]),unname(balanced["adjusted"]))
      expect_equal(unname(balanced["ess"]),100)
    })
    test_that("missing support is refused", {
      expect_error(weighted_estimate(c(0,80),c(0.9,0.5),c(0.8,0.2)),"no observations")
    })
  `},eli5Trace:["The respondents contain mostly the less-satisfied group:20*0.9+80*0.5 gives58 satisfied people out of100.","The school contains mostly the other group. Giving the two group means their known population shares gives0.82.","A respondent in groupA gets weight4 and one in B gets0.25. That imbalance makes the simple unequal-weight effective-size diagnostic about30.77, not100."],complexity:{time:"O(k) for these k group aggregates; O(n+k) to aggregate n respondents first",space:"O(k) group weights",note:"The program computes a point estimate and a Kish weight-dispersion diagnostic, not a design-based confidence interval."},edgeCases:["A positive-share target group with zero respondents cannot be repaired by a finite post-stratification weight.","If observed and target proportions match, all weights are equal and the unequal-weight effective n equals the respondent count.","If respondents and nonrespondents differ in outcome within every recorded group, composition weighting can still leave bias."],incorrect:{language:"python",code:"standard_error = sample_sd / sqrt(1000000)\nprint('A million rows means no selection bias')",whyWrong:"The small standard error describes random variation under assumptions about the observed data, not systematic absence of relevant people. More biased observations can narrow an interval around the wrong target.",fix:"Define the population and recruitment mechanism, assess coverage and response differences, justify any weights, and use uncertainty estimation appropriate to the design."},walkthrough:[{python:"if any(n==0 and s>0",r:"if (any(counts==0 & shares>0))",pythonLines:2,rLines:1,eli5:"Refuse to invent an outcome for a target group that has no respondents."},{python:"raw =",r:"raw <-",pythonLines:2,rLines:2,eli5:"Compare the respondents' mixture with the target population's mixture using the same group means."},{python:"weights =",r:"weights <-",pythonLines:5,rLines:6,eli5:"Calculate how much each respondent represents and how unequal those weights are."},{python:"print(f\"respondent mean:",r:"cat(sprintf(\"respondent mean:",pythonLines:3,rLines:3,eli5:"Report the original answer, the assumption-dependent adjusted answer, and the precision warning separately."}]},
  flow:{title:"Trace who enters an estimate",nodes:[node("target","Target population",0,100),node("frame","Reachable sampling frame",250,100),node("response","Selected respondents",500,100),node("support","Check support and assumptions",750,100),node("estimate","Weighted estimate and limits",750,260)],edges:[edge("target","frame"),edge("frame","response"),edge("response","support"),edge("support","estimate")],steps:[step("target","","State whose outcome the estimate should describe."),step("target frame","target-frame","Check which target members are reachable before any random selection."),step("frame response","frame-response","Track recruitment, nonresponse and analytic exclusions."),step("response support","response-support","Check population margins, within-group assumptions and missing strata."),step("support estimate","support-estimate","Compute a justified adjustment and report uncertainty and remaining bias risks.")]},
  practice:[{id:"w05-selection-million",type:"case",prompt:"A million voluntary product reviews have a tiny confidence interval. Can you claim that all customers are equally satisfied?",answer:"No. People who choose to review may differ from those who do not, and customers who never reach the review surface may be absent. Define the target customer population, inspect recruitment and response, compare relevant benchmarks, and report the scope. Precision about reviewers is not representativeness of customers.",rubric:["Selection mechanism","Target versus observed population","Precision versus bias"]},{id:"w05-selection-assignment",type:"recall",prompt:"What is the difference between randomly selecting people and randomly assigning a treatment to volunteers?",answer:"Random sampling concerns who enters and can support population inference under the sampling design. Random assignment concerns which treatment enrolled people receive and supports internal causal comparisons under the experiment's assumptions. Random assignment alone does not make volunteers representative of everyone.",rubric:["Recruitment versus treatment","Population versus internal comparison","No automatic generalization"]},{id:"w05-selection-no-group",type:"design",prompt:"A target group is10% of the population and0% of your respondents. Your manager asks you to weight it back in. What do you do?",answer:"A finite weight cannot supply a missing outcome mean. Seek targeted data collection or a suitable external source, narrow the estimand, or use an explicit extrapolation model with defensible assumptions and sensitivity analysis. Mark the unsupported group rather than assigning the observed groups' mean silently.",rubric:["Support violation","Data or target change","Explicit modelling assumptions","No invented outcome"]}],
  references:[{title:"AAPOR: Best Practices for Survey Research",url:"https://aapor.org/standards-and-ethics/best-practices/",versionSensitive:true},{title:"AAPOR: Standard Definitions",url:"https://aapor.org/standards-and-ethics/standard-definitions/",versionSensitive:true},{title:"CDC NHANES: Sample Design",url:"https://wwwn.cdc.gov/nchs/nhanes/tutorials/SampleDesign.aspx",versionSensitive:true}],lastReviewed:"2026-10-28",
});
