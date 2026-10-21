import type { WalkthroughStepInput } from "@/lib/curriculum";

export const walkthroughs: Record<string, WalkthroughStepInput[]> = {
  "w01-d01-python-r-idioms": [
    { python: "from collections import Counter", r: "top_words <- function(text, k) {", eli5: "First we get our tools ready. Python borrows a ready-made tally counter; R starts writing its own little machine called top_words." },
    { python: "counts = Counter(text.lower().split())", r: "words <- strsplit(tolower(text), ", rLines: 2, eli5: "Make every letter small so 'The' and 'the' match, cut the sentence into words at the spaces, then make a tally mark for every word." },
    { python: "return sorted(counts.items()", r: "ord <- order(-as.integer(counts), names(counts))", rLines: 2, eli5: "Line the words up: the biggest tally first, and when two tallies are the same, alphabetical order decides. Then keep only the first k." },
    { python: 'text = "the cat and the hat and the bat"', r: 'text <- "the cat and the hat and the bat"', eli5: "Here is the sentence we want to look at." },
    { python: "for word, n in top_words(text, 3):", pythonLines: 2, r: "for (w in names(top))", eli5: "Ask the machine for the top 3 and say each one out loud with its tally: the 3, and 2, bat 1." },
  ],
  "w03-d01-hashing-patterns": [
    { python: "def group_anagrams(words: list[str])", r: "group_anagrams <- function(words) {", eli5: "We build a sorting machine. It gets a pile of words and must put words made of the same letters into the same box." },
    { python: '"".join(sorted(w))', r: "keys <- vapply(words", eli5: "For each word, put its letters in ABC order to make a label: 'eat', 'tea' and 'ate' all become 'aet'. Same letters, same label." },
    { python: "groups[", r: "groups <- lapply(split(words, keys), sort)", eli5: "Drop each word into the box with its label. A hash map finds the right box instantly, like reading the label on a mailbox." },
    { python: "return sorted(sorted(g) for g in groups.values())", r: "groups[order(", eli5: "Tidy up: sort the words inside each box, then sort the boxes, so the answer comes out in the same order every time." },
    { python: 'print(f"groups: {len(groups)}")', pythonLines: 3, r: 'cat(sprintf("groups: %d', rLines: 2, eli5: "Say how many boxes there are (3), then read out each box: ate eat tea, bat, nat tan." },
  ],
};
