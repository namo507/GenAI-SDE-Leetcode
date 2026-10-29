import { foundationLabs } from "./foundations";
import { quantitativeLabs } from "./quantitative";
import { systemsAiLabs } from "./systems-ai";

const related: Record<string, string[]> = {
  "attention-temperature": ["w01-d05-linear-algebra-geometry", "w05-d04-information-theory", "w09-d03-numerical-stability"],
  "simpsons-paradox": ["w05-d05-sampling-selection-bias"],
};
export const labs = [...quantitativeLabs, ...foundationLabs, ...systemsAiLabs].map((lab) => ({ ...lab, topicIds: [...new Set([...lab.topicIds, ...(related[lab.id] ?? [])])] }));
export const findLab = (id: string) => labs.find((lab) => lab.id === id);
export const labsForTopic = (topicId: string) => labs.filter((lab) => lab.topicIds.includes(topicId));
